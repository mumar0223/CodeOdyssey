import { query } from "./_generated/server";
import { v } from "convex/values";

export const getGlobalLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    // Fetch top entries from the leaderboards table, ordered by rating descending
    const leaderboardEntries = await ctx.db
      .query("leaderboards")
      .withIndex("by_rating")
      .order("desc")
      .take(20); // Fetch extra to account for bot filtering

    // Join with users table to get display names and rank badges
    const leaders = await Promise.all(
      leaderboardEntries.map(async (entry) => {
        const user = await ctx.db.get(entry.user_id);
        return {
          _id: entry._id,
          user_id: entry.user_id,
          public_id: user?.public_id ?? "",
          username: user?.username ?? "Unknown",
          profile_picture: user?.profile_picture ?? null,
          userRank: user?.rank ?? "Bronze I",
          rating: entry.rating,
          rank: entry.rank,
          wins: entry.wins,
          losses: entry.losses,
        };
      })
    );

    // Filter out bot users and return top 10
    return leaders
      .filter((leader) => !leader.username.startsWith("AI_Bot_") && !leader.public_id.startsWith("bot_"))
      .slice(0, 10);
  },
});

