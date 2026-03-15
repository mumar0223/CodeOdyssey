import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Detect weak topics for a user.
 * A topic is "weak" if:
 * - success_rate < 50% (any number of attempts)
 * - success_rate < 60% AND total_attempts > 5 (pattern of struggle)
 * - success_rate < 70% AND avg_time is high relative to other topics
 */
export const getWeakTopics = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("userTopicStats")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    if (stats.length === 0) return [];

    // Calculate average time across all topics for comparison
    const avgTimeAll =
      stats.reduce((sum, s) => sum + s.avg_time, 0) / stats.length;

    const weakTopics = stats
      .filter((stat) => {
        // Must have at least 1 attempt to be considered
        if (stat.total_attempts < 1) return false;

        // Definitely weak: very low success rate
        if (stat.success_rate < 50) return true;

        // Struggling pattern: moderate attempts, still below threshold
        if (stat.total_attempts > 5 && stat.success_rate < 60) return true;

        // Slow solver: success rate okay-ish but takes much longer than average
        if (
          stat.success_rate < 70 &&
          stat.avg_time > 0 &&
          stat.avg_time > avgTimeAll * 1.5
        )
          return true;

        return false;
      })
      .sort((a, b) => a.success_rate - b.success_rate) // Weakest first
      .slice(0, 5); // Top 5 weak topics

    return weakTopics;
  },
});

/**
 * Get weak topics by public_id (for profile pages & home page)
 */
export const getWeakTopicsByPublicId = query({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();

    if (!user) return [];

    const stats = await ctx.db
      .query("userTopicStats")
      .withIndex("by_user", (q) => q.eq("user_id", user._id))
      .collect();

    if (stats.length === 0) return [];

    const avgTimeAll =
      stats.reduce((sum, s) => sum + s.avg_time, 0) / stats.length;

    return stats
      .filter((stat) => {
        if (stat.total_attempts < 1) return false;
        if (stat.success_rate < 50) return true;
        if (stat.total_attempts > 5 && stat.success_rate < 60) return true;
        if (
          stat.success_rate < 70 &&
          stat.avg_time > 0 &&
          stat.avg_time > avgTimeAll * 1.5
        )
          return true;
        return false;
      })
      .sort((a, b) => a.success_rate - b.success_rate)
      .slice(0, 5);
  },
});
