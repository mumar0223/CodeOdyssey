import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserProfile = query({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();
    return user;
  },
});

export const updateUserProfile = mutation({
  args: {
    public_id: v.string(),
    username: v.optional(v.string()),
    profile_picture: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();
    
    if (!user) throw new Error("User not found");

    const updates: any = {};
    if (args.username) updates.username = args.username;
    if (args.profile_picture) updates.profile_picture = args.profile_picture;

    await ctx.db.patch(user._id, updates);
    return true;
  },
});

export const getUserActivity = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();
    return submissions;
  }
});

// Get real stats: wins, losses, accuracy, solved_count
export const getUserStats = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    // Get leaderboard record for wins/losses
    const lb = await ctx.db
      .query("leaderboards")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .first();

    // Get submission data for accuracy
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    const total = submissions.length;
    const accepted = submissions.filter((s) => s.result === "Accepted").length;
    const accuracy = total > 0 ? Math.round((accepted / total) * 100) : 0;

    // Count unique questions solved (accepted at least once)
    const solvedQuestionIds = new Set(
      submissions.filter((s) => s.result === "Accepted").map((s) => s.question_id)
    );

    return {
      wins: lb?.wins ?? 0,
      losses: lb?.losses ?? 0,
      accuracy,
      solved_count: solvedQuestionIds.size,
    };
  },
});

// Get distinct languages the user has submitted code in
export const getUserLanguages = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const submissions = await ctx.db
      .query("submissions")
      .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
      .collect();

    const languages = [...new Set(submissions.map((s) => s.language))];
    return languages;
  },
});

// Update user avatar URL
export const updateUserAvatar = mutation({
  args: {
    public_id: v.string(),
    avatar_url: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { profile_picture: args.avatar_url });
    return true;
  },
});

// Ensures a record exists in the app "users" table for a Better Auth user.
// Called after sign-in/sign-up to bridge Better Auth's internal user storage
// with the app's users table used by matches, leaderboards, etc.
export const ensureUser = mutation({
  args: {
    public_id: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();

    if (existing) return existing._id;

    // Create new app user record
    const userId = await ctx.db.insert("users", {
      public_id: args.public_id,
      username: args.name || "Unnamed Coder",
      rating: 500,
      rank: "Bronze I",
      coins: 100,
      solved_count: 0,
      accuracy: 0,
      created_at: Date.now(),
    });

    return userId;
  },
});

