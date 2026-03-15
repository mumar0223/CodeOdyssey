import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Arena Agent — decides daily whether to host a public arena.
 * Called via API route which invokes Gemini to make the decision.
 * This file handles the Convex side (creating matches, logging events).
 */

// Log an arena event decision
export const logArenaEvent = mutation({
  args: {
    event_date: v.string(),
    event_type: v.string(),
    decided_by_ai: v.boolean(),
    ai_reasoning: v.optional(v.string()),
    match_id: v.optional(v.id("matches")),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("arenaEvents", {
      event_date: args.event_date,
      event_type: args.event_type,
      decided_by_ai: args.decided_by_ai,
      ai_reasoning: args.ai_reasoning,
      match_id: args.match_id,
    });
  },
});

// Create an AI-hosted arena match
export const createAIHostedArena = mutation({
  args: {
    arena_name: v.string(),
    difficulty: v.string(),
    number_of_questions: v.number(),
    time_limit: v.number(),
    allowed_languages: v.array(v.string()),
    max_players: v.number(),
    scheduled_for: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Use the first user as "system host" or create a bot host
    const systemUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q: any) => q.eq("username", "CodeOdyssey"))
      .first();

    // If no system user, pick the first available user
    const hostUser = systemUser || (await ctx.db.query("users").first());
    if (!hostUser) throw new Error("No users exist yet — cannot create AI arena");

    // Generate invite code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let invite_code = "";
    for (let i = 0; i < 6; i++) {
      invite_code += chars[Math.floor(Math.random() * chars.length)];
    }

    const matchId = await ctx.db.insert("matches", {
      host_id: hostUser._id,
      mode: "Battle Royale",
      difficulty: args.difficulty,
      number_of_questions: args.number_of_questions,
      time_limit: args.time_limit,
      allowed_languages: args.allowed_languages,
      visibility: "public",
      status: "waiting",
      created_at: Date.now(),
      arena_name: args.arena_name,
      invite_code,
      max_players: args.max_players,
      is_active: true,
      hosted_by_app: true,
      scheduled_for: args.scheduled_for,
    });

    return matchId;
  },
});

// Check if an arena event already exists for a given date
export const getArenaEventByDate = query({
  args: { event_date: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("arenaEvents")
      .withIndex("by_date", (q) => q.eq("event_date", args.event_date))
      .first();
  },
});

// Get recent arena events for display
export const getRecentArenaEvents = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("arenaEvents")
      .order("desc")
      .take(10);
  },
});
