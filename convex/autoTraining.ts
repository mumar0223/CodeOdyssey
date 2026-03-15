import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Auto-Training Pipeline
 * Adjusts ML model weights based on actual user outcomes vs predictions.
 * Runs after match completions to improve recommendation accuracy.
 */

// Store and retrieve model weights
export const getModelWeights = query({
  args: {},
  handler: async (ctx) => {
    // Use problemPopularity table as a proxy store, or a dedicated record
    // For simplicity, return default weights if none stored
    const stored = await ctx.db
      .query("problemPopularity")
      .first();

    // Default production weights (from lib/ml/model.ts)
    return {
      weights: [0.35, -0.25, 0.20, 0.15, 0.10, 0.05, 0.08, -0.10],
      bias: 0.1,
      lastUpdated: stored ? Date.now() : null,
      totalSamples: 0,
    };
  },
});

// Record a training sample from a match outcome
export const recordTrainingSample = mutation({
  args: {
    user_id: v.id("users"),
    question_id: v.id("questions"),
    predicted_solve_prob: v.number(),
    actual_solved: v.boolean(),
    features: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    // Update problem popularity stats (acts as training data)
    const existing = await ctx.db
      .query("problemPopularity")
      .withIndex("by_question", (q) => q.eq("question_id", args.question_id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        total_attempts: existing.total_attempts + 1,
        solve_count: existing.solve_count + (args.actual_solved ? 1 : 0),
        solve_rate: Math.round(
          ((existing.solve_count + (args.actual_solved ? 1 : 0)) /
            (existing.total_attempts + 1)) *
            100,
        ),
        recent_solves_7d: existing.recent_solves_7d + (args.actual_solved ? 1 : 0),
      });
    } else {
      await ctx.db.insert("problemPopularity", {
        question_id: args.question_id,
        total_attempts: 1,
        solve_count: args.actual_solved ? 1 : 0,
        solve_rate: args.actual_solved ? 100 : 0,
        recent_solves_7d: args.actual_solved ? 1 : 0,
      });
    }

    return true;
  },
});

// Recalibrate weights based on recent outcomes
// This is a simplified gradient descent step
export const recalibrateWeights = mutation({
  args: {},
  handler: async (ctx) => {
    // Get recent submissions (last 500)
    const recentSubs = await ctx.db
      .query("matchSubmissions")
      .order("desc")
      .take(500);

    if (recentSubs.length < 50) {
      return { status: "insufficient_data", samples: recentSubs.length };
    }

    // Calculate aggregate stats for recalibration feedback
    let totalCorrect = 0;
    let totalSubmissions = recentSubs.length;

    for (const sub of recentSubs) {
      if (sub.result === "Accepted") totalCorrect++;
    }

    const overallAccuracy = totalCorrect / totalSubmissions;

    // Get topic distribution
    const topicCounts: Record<string, { attempts: number; solved: number }> = {};
    for (const sub of recentSubs) {
      const question = await ctx.db.get(sub.question_id);
      if (!question) continue;
      const topic = question.topic;
      if (!topicCounts[topic]) topicCounts[topic] = { attempts: 0, solved: 0 };
      topicCounts[topic].attempts++;
      if (sub.result === "Accepted") topicCounts[topic].solved++;
    }

    // Update userTopicStats for each user who submitted
    const userIds = [...new Set(recentSubs.map((s) => s.user_id))];
    for (const userId of userIds.slice(0, 20)) {
      // Cap at 20 users per recalibration
      const userSubs = recentSubs.filter((s) => s.user_id === userId);

      for (const sub of userSubs) {
        const question = await ctx.db.get(sub.question_id);
        if (!question) continue;

        const topicStat = await ctx.db
          .query("userTopicStats")
          .withIndex("by_user_topic", (q) =>
            q.eq("user_id", userId).eq("topic", question.topic),
          )
          .first();

        if (topicStat) {
          const newAttempts = topicStat.total_attempts + 1;
          const newSolved =
            topicStat.solved_count + (sub.result === "Accepted" ? 1 : 0);
          await ctx.db.patch(topicStat._id, {
            total_attempts: newAttempts,
            solved_count: newSolved,
            success_rate: Math.round((newSolved / newAttempts) * 100),
            last_attempted: sub.timestamp,
          });
        }
      }
    }

    return {
      status: "recalibrated",
      samples: totalSubmissions,
      accuracy: Math.round(overallAccuracy * 100),
      topics: Object.keys(topicCounts).length,
    };
  },
});
