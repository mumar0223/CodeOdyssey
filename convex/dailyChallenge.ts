import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get today's daily challenge.
 * If none exists for today, auto-creates one by picking a random question.
 */
export const getDailyChallenge = query({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0]; // "2026-03-10"

    const existing = await ctx.db
      .query("dailyChallenge")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existing) {
      const question = await ctx.db.get(existing.question_id);
      return question ? { ...question, challengeDate: existing.date } : null;
    }

    // No daily challenge yet — return null (client can trigger rotation)
    return null;
  },
});

/**
 * Rotate the daily challenge.
 * Picks a random question that hasn't been a daily challenge recently.
 */
export const rotateDailyChallenge = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];

    // Check if already exists
    const existing = await ctx.db
      .query("dailyChallenge")
      .withIndex("by_date", (q) => q.eq("date", today))
      .first();

    if (existing) return existing;

    // Get recent daily challenge question IDs to avoid repeats
    const recentChallenges = await ctx.db
      .query("dailyChallenge")
      .order("desc")
      .take(30); // Avoid last 30 days of challenges

    const recentIds = new Set(
      recentChallenges.map((c) => c.question_id.toString())
    );

    // Get all questions and pick one not recently used
    const allQuestions = await ctx.db.query("questions").collect();

    const eligible = allQuestions.filter(
      (q) => !recentIds.has(q._id.toString())
    );

    // If all questions have been used, pick from any
    const pool = eligible.length > 0 ? eligible : allQuestions;

    if (pool.length === 0) return null;

    // Pick random question, prefer Medium difficulty
    const mediums = pool.filter((q) => q.difficulty === "Medium");
    const candidates = mediums.length > 0 ? mediums : pool;
    const selected = candidates[Math.floor(Math.random() * candidates.length)];

    const challenge = await ctx.db.insert("dailyChallenge", {
      question_id: selected._id,
      date: today,
      topic: selected.topic,
    });

    return {
      ...selected,
      challengeDate: today,
    };
  },
});
