import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Difficulty string → numeric rating mapping
const DIFFICULTY_RATING: Record<string, number> = {
  "Easy": 1000,
  "Medium": 1500,
  "Hard": 2000,
  "Very Hard": 2500,
};

/**
 * Update topic stats after a submission.
 * Called internally after each submission/match submission.
 */
export const updateTopicStats = mutation({
  args: {
    user_id: v.id("users"),
    topic: v.string(),
    solved: v.boolean(),
    time_taken: v.number(), // seconds
    difficulty: v.string(),
  },
  handler: async (ctx, args) => {
    const difficultyRating = DIFFICULTY_RATING[args.difficulty] || 1500;

    // Find existing stats for this user+topic
    const existing = await ctx.db
      .query("userTopicStats")
      .withIndex("by_user_topic", (q) =>
        q.eq("user_id", args.user_id).eq("topic", args.topic)
      )
      .first();

    if (existing) {
      const newAttempts = existing.total_attempts + 1;
      const newSolved = existing.solved_count + (args.solved ? 1 : 0);
      const newSuccessRate = Math.round((newSolved / newAttempts) * 100);

      // Running average for time (only count solved problems)
      const newAvgTime = args.solved
        ? Math.round(
            (existing.avg_time * existing.solved_count + args.time_taken) /
              (existing.solved_count + 1)
          )
        : existing.avg_time;

      // Running average for difficulty (only count solved problems)
      const newAvgDifficulty = args.solved
        ? Math.round(
            (existing.avg_difficulty * existing.solved_count + difficultyRating) /
              (existing.solved_count + 1)
          )
        : existing.avg_difficulty;

      await ctx.db.patch(existing._id, {
        total_attempts: newAttempts,
        solved_count: newSolved,
        success_rate: newSuccessRate,
        avg_time: newAvgTime,
        avg_difficulty: newAvgDifficulty,
        last_attempted: Date.now(),
      });
    } else {
      await ctx.db.insert("userTopicStats", {
        user_id: args.user_id,
        topic: args.topic,
        total_attempts: 1,
        solved_count: args.solved ? 1 : 0,
        success_rate: args.solved ? 100 : 0,
        avg_time: args.solved ? args.time_taken : 0,
        avg_difficulty: args.solved ? difficultyRating : 0,
        last_attempted: Date.now(),
      });
    }
  },
});

/**
 * Get all topic stats for a user (for skill radar + recommendations)
 */
export const getUserTopicStats = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userTopicStats")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();
  },
});

/**
 * Get topic stats for a user by their public_id (for profile pages)
 */
export const getUserTopicStatsByPublicId = query({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("userTopicStats")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();
  },
});

/**
 * Backfill topic stats from existing submissions (one-time migration)
 */
export const backfillTopicStats = mutation({
  args: {},
  handler: async (ctx) => {
    const submissions = await ctx.db.query("submissions").collect();
    let processed = 0;

    for (const sub of submissions) {
      const question = await ctx.db.get(sub.question_id);
      if (!question) continue;

      const topic = question.topic;
      const solved = sub.result === "Accepted";
      const timeTaken = Math.round(sub.runtime / 1000); // ms to seconds

      const existing = await ctx.db
        .query("userTopicStats")
        .withIndex("by_user_topic", (q) =>
          q.eq("user_id", sub.user_id).eq("topic", topic)
        )
        .first();

      const difficultyRating = DIFFICULTY_RATING[question.difficulty] || 1500;

      if (existing) {
        const newAttempts = existing.total_attempts + 1;
        const newSolved = existing.solved_count + (solved ? 1 : 0);
        const newSuccessRate = Math.round((newSolved / newAttempts) * 100);
        const newAvgTime = solved
          ? Math.round(
              (existing.avg_time * existing.solved_count + timeTaken) /
                (existing.solved_count + 1)
            )
          : existing.avg_time;
        const newAvgDifficulty = solved
          ? Math.round(
              (existing.avg_difficulty * existing.solved_count + difficultyRating) /
                (existing.solved_count + 1)
            )
          : existing.avg_difficulty;

        await ctx.db.patch(existing._id, {
          total_attempts: newAttempts,
          solved_count: newSolved,
          success_rate: newSuccessRate,
          avg_time: newAvgTime,
          avg_difficulty: newAvgDifficulty,
          last_attempted: sub.submitted_at,
        });
      } else {
        await ctx.db.insert("userTopicStats", {
          user_id: sub.user_id,
          topic,
          total_attempts: 1,
          solved_count: solved ? 1 : 0,
          success_rate: solved ? 100 : 0,
          avg_time: solved ? timeTaken : 0,
          avg_difficulty: solved ? difficultyRating : 0,
          last_attempted: sub.submitted_at,
        });
      }

      processed++;
    }

    return { processed };
  },
});
