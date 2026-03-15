import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Update problem popularity metrics after each submission.
 */
export const updateProblemStats = mutation({
  args: {
    question_id: v.id("questions"),
    solved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("problemPopularity")
      .withIndex("by_question", (q) => q.eq("question_id", args.question_id))
      .first();

    const now = Date.now();

    if (existing) {
      const newAttempts = existing.total_attempts + 1;
      const newSolves = existing.solve_count + (args.solved ? 1 : 0);
      const newSolveRate = Math.round((newSolves / newAttempts) * 100);
      const newRecent = existing.recent_solves_7d + (args.solved ? 1 : 0);

      await ctx.db.patch(existing._id, {
        total_attempts: newAttempts,
        solve_count: newSolves,
        solve_rate: newSolveRate,
        recent_solves_7d: newRecent,
      });
    } else {
      await ctx.db.insert("problemPopularity", {
        question_id: args.question_id,
        total_attempts: 1,
        solve_count: args.solved ? 1 : 0,
        solve_rate: args.solved ? 100 : 0,
        recent_solves_7d: args.solved ? 1 : 0,
      });
    }
  },
});

/**
 * Get trending problems (most recent solves in 7 days)
 */
export const getTrendingProblems = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 6;

    // Get popularity entries sorted by recent solves
    const popular = await ctx.db
      .query("problemPopularity")
      .withIndex("by_recent_solves")
      .order("desc")
      .take(limit * 2); // Fetch extra for joining

    // Join with questions
    const results = [];
    for (const pop of popular) {
      const question = await ctx.db.get(pop.question_id);
      if (question) {
        results.push({
          ...question,
          popularity: pop,
        });
      }
      if (results.length >= limit) break;
    }

    return results;
  },
});

/**
 * Get problem popularity for a specific question
 */
export const getProblemPopularity = query({
  args: { question_id: v.id("questions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("problemPopularity")
      .withIndex("by_question", (q) => q.eq("question_id", args.question_id))
      .first();
  },
});

/**
 * Decay recent_solves_7d — should be called periodically (e.g. daily cron)
 * Reduces count to simulate rolling 7-day window.
 */
export const decayRecentSolves = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("problemPopularity").collect();
    let updated = 0;

    for (const pop of all) {
      if (pop.recent_solves_7d > 0) {
        // Decay by ~14% per day (≈ 1/7th)
        const decayed = Math.max(0, Math.floor(pop.recent_solves_7d * 0.86));
        await ctx.db.patch(pop._id, { recent_solves_7d: decayed });
        updated++;
      }
    }

    return { updated };
  },
});
