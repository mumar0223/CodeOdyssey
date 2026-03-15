import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const initAchievements = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("achievements").collect();
    if (existing.length > 0) return "Already initialized";

    const defaultAchievements = [
      { name: "First Blood", description: "First to solve a problem in an Arena match", icon: "🩸" },
      { name: "Speed Demon", description: "Solve a problem in under 60 seconds", icon: "⚡" },
      { name: "Win Streak", description: "Win 3 Arena matches in total", icon: "🔥" },
      { name: "Brainiac", description: "Achieve a 100% code efficiency score", icon: "🧠" },
      { name: "Flawless Victory", description: "Win an Arena match without any penalties", icon: "💎" },
    ];

    for (const a of defaultAchievements) {
      await ctx.db.insert("achievements", {
        name: a.name,
        description: a.description,
        icon: a.icon,
      });
    }
    return "Initialized " + defaultAchievements.length + " achievements";
  }
});

export const getUserAchievements = query({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", q => q.eq("public_id", args.public_id))
      .first();
    if (!user) return [];

    const userAchvs = await ctx.db
      .query("userAchievements")
      .withIndex("by_user", q => q.eq("user_id", user._id))
      .collect();

    const achievements = await Promise.all(
      userAchvs.map(async (ua) => {
        const ach = await ctx.db.get(ua.achievement_id);
        return { ...ua, details: ach };
      })
    );

    return achievements.sort((a, b) => b.earned_at - a.earned_at); // newest first
  }
});

export const checkWinStreak = mutation({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", q => q.eq("public_id", args.public_id))
      .first();
    if (!user) return false;

    const lb = await ctx.db.query("leaderboards").withIndex("by_user", q => q.eq("user_id", user._id)).first();
    if (!lb || lb.wins < 3) return false;

    const achv = await ctx.db.query("achievements").filter(q => q.eq(q.field("name"), "Win Streak")).first();
    if (!achv) return false;

    const alreadyHas = await ctx.db.query("userAchievements").withIndex("by_user", q => q.eq("user_id", user._id))
      .filter(q => q.eq(q.field("achievement_id"), achv._id)).first();

    if (!alreadyHas) {
      await ctx.db.insert("userAchievements", {
        user_id: user._id,
        achievement_id: achv._id,
        earned_at: Date.now()
      });
      return true; // Newly unlocked
    }
    return false;
  }
});

export const checkSpeedDemonAndBrainiac = mutation({
  args: { public_id: v.string(), time_taken: v.number(), score: v.number() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", q => q.eq("public_id", args.public_id))
      .first();
    if (!user) return [];

    const unlocked = [];
    
    // Speed Demon
    if (args.time_taken < 60) {
      const achv = await ctx.db.query("achievements").filter(q => q.eq(q.field("name"), "Speed Demon")).first();
      if (achv) {
        const alreadyHas = await ctx.db.query("userAchievements").withIndex("by_user", q => q.eq("user_id", user._id))
          .filter(q => q.eq(q.field("achievement_id"), achv._id)).first();
        if (!alreadyHas) {
          await ctx.db.insert("userAchievements", { user_id: user._id, achievement_id: achv._id, earned_at: Date.now() });
          unlocked.push({ name: achv.name, icon: achv.icon });
        }
      }
    }

    // Brainiac
    if (args.score >= 100) {
      const achv = await ctx.db.query("achievements").filter(q => q.eq(q.field("name"), "Brainiac")).first();
      if (achv) {
        const alreadyHas = await ctx.db.query("userAchievements").withIndex("by_user", q => q.eq("user_id", user._id))
          .filter(q => q.eq(q.field("achievement_id"), achv._id)).first();
        if (!alreadyHas) {
          await ctx.db.insert("userAchievements", { user_id: user._id, achievement_id: achv._id, earned_at: Date.now() });
          unlocked.push({ name: achv.name, icon: achv.icon });
        }
      }
    }

    return unlocked;
  }
});
