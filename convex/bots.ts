import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Fetch all bots, ordered by rating desc
export const getBots = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("aiBots")
      .withIndex("by_rating")
      .order("desc")
      .collect();
  },
});

// Pick a random bot for practice mode
export const getRandomBot = query({
  args: {},
  handler: async (ctx) => {
    const bots = await ctx.db.query("aiBots").collect();
    if (bots.length === 0) return null;
    return bots[Math.floor(Math.random() * bots.length)];
  },
});

// Seed preset bots into the aiBots table
export const seedBots = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("aiBots").collect();
    if (existing.length > 0) return "Bots already seeded";

    const presetBots = [
      { name: "ByteStorm", rating: 1800, rank: "Platinum I", language_speciality: "Python" },
      { name: "NullPointer", rating: 1600, rank: "Gold II", language_speciality: "Java" },
      { name: "SegFault", rating: 1400, rank: "Gold I", language_speciality: "C++" },
      { name: "SyntaxErr", rating: 1200, rank: "Silver II", language_speciality: "JavaScript" },
      { name: "RecurBot", rating: 1100, rank: "Silver I", language_speciality: "Python" },
      { name: "StackOver", rating: 1000, rank: "Bronze III", language_speciality: "TypeScript" },
      { name: "DeadLock", rating: 900, rank: "Bronze II", language_speciality: "C++" },
      { name: "HeapDump", rating: 800, rank: "Bronze I", language_speciality: "Java" },
    ];

    for (const bot of presetBots) {
      await ctx.db.insert("aiBots", bot);
    }

    return "Bots seeded successfully";
  },
});
