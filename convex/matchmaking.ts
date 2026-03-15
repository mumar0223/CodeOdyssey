import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Find a practice bot within ±200 of user's rating.
 * Returns the closest bot by rating difference.
 */
export const findPracticeBot = query({
  args: {
    user_rating: v.number(),
    range: v.optional(v.number()), // defaults to 200
  },
  handler: async (ctx, args) => {
    const range = args.range || 200;
    const minRating = args.user_rating - range;
    const maxRating = args.user_rating + range;

    // Fetch all bots and filter by range
    const allBots = await ctx.db
      .query("aiBots")
      .withIndex("by_rating")
      .collect();

    const inRange = allBots.filter(
      (bot) => bot.rating >= minRating && bot.rating <= maxRating
    );

    if (inRange.length === 0) {
      // Fallback: return closest bot regardless of range
      if (allBots.length === 0) return null;
      return allBots.reduce((closest, bot) =>
        Math.abs(bot.rating - args.user_rating) <
        Math.abs(closest.rating - args.user_rating)
          ? bot
          : closest
      );
    }

    // Sort by closest rating difference
    inRange.sort(
      (a, b) =>
        Math.abs(a.rating - args.user_rating) -
        Math.abs(b.rating - args.user_rating)
    );

    return inRange[0];
  },
});

/**
 * Join the matchmaking queue for real matches.
 */
export const joinQueue = mutation({
  args: {
    public_id: v.string(),
    mode: v.string(),         // "ranked" or "casual"
    difficulty: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();

    if (!user) throw new Error("User not found");

    // Check if already in queue
    const existingEntry = await ctx.db
      .query("matchmakingQueue")
      .withIndex("by_mode", (q) => q.eq("mode", args.mode))
      .collect();

    const alreadyQueued = existingEntry.find(
      (e) => e.user_id === user._id
    );

    if (alreadyQueued) {
      return { status: "already_queued", queueId: alreadyQueued._id };
    }

    const queueId = await ctx.db.insert("matchmakingQueue", {
      user_id: user._id,
      rating: user.rating,
      mode: args.mode,
      difficulty: args.difficulty,
      joined_at: Date.now(),
    });

    return { status: "queued", queueId };
  },
});

/**
 * Leave the matchmaking queue.
 */
export const leaveQueue = mutation({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();

    if (!user) return;

    const entries = await ctx.db
      .query("matchmakingQueue")
      .collect();

    for (const entry of entries) {
      if (entry.user_id === user._id) {
        await ctx.db.delete(entry._id);
      }
    }
  },
});

/**
 * Find a match for a queued player.
 * Searches for opponents within ±200 rating, prioritizing closest.
 * Progressively widens range based on time waiting.
 */
export const findMatch = mutation({
  args: {
    public_id: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();

    if (!user) throw new Error("User not found");

    // Find this user's queue entry
    const allQueued = await ctx.db
      .query("matchmakingQueue")
      .collect();

    const myEntry = allQueued.find((e) => e.user_id === user._id);
    if (!myEntry) return { status: "not_in_queue" };

    const now = Date.now();
    const waitTimeMs = now - myEntry.joined_at;
    const waitTimeSec = waitTimeMs / 1000;

    // Progressive range widening
    let range = 200;
    if (waitTimeSec > 60) range = 500;
    else if (waitTimeSec > 30) range = 300;

    // Find potential opponents (exclude self)
    const opponents = allQueued.filter((e) => {
      if (e.user_id === user._id) return false;
      if (e.mode !== myEntry.mode) return false;
      const ratingDiff = Math.abs(e.rating - user.rating);
      return ratingDiff <= range;
    });

    if (opponents.length === 0) {
      return {
        status: "searching",
        waitTime: waitTimeSec,
        currentRange: range,
      };
    }

    // Sort by closest rating
    opponents.sort(
      (a, b) =>
        Math.abs(a.rating - user.rating) - Math.abs(b.rating - user.rating)
    );

    const bestMatch = opponents[0];

    // Remove both from queue
    await ctx.db.delete(myEntry._id);
    await ctx.db.delete(bestMatch._id);

    return {
      status: "matched",
      opponent_user_id: bestMatch.user_id,
      rating_diff: Math.abs(bestMatch.rating - user.rating),
    };
  },
});

/**
 * Get current queue status for a user.
 */
export const getQueueStatus = query({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();

    if (!user) return null;

    const allQueued = await ctx.db
      .query("matchmakingQueue")
      .collect();

    const myEntry = allQueued.find((e) => e.user_id === user._id);

    if (!myEntry) return null;

    const waitTimeSec = (Date.now() - myEntry.joined_at) / 1000;
    let range = 200;
    if (waitTimeSec > 60) range = 500;
    else if (waitTimeSec > 30) range = 300;

    const potentialOpponents = allQueued.filter(
      (e) =>
        e.user_id !== user._id &&
        e.mode === myEntry.mode &&
        Math.abs(e.rating - user.rating) <= range
    ).length;

    return {
      inQueue: true,
      waitTime: Math.round(waitTimeSec),
      currentRange: range,
      potentialOpponents,
      queueSize: allQueued.length,
    };
  },
});
