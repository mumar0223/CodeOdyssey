import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get random questions
 */
export const getRandomQuestions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 5;

    const questions = await ctx.db.query("questions").take(limit);

    return questions;
  },
});

/**
 * Featured hard challenges
 */
export const getFeaturedChallenges = query({
  args: {},
  handler: async (ctx) => {
    const featured = await ctx.db
      .query("questions")
      .withIndex("by_difficulty", (q) => q.eq("difficulty", "Hard"))
      .take(3);

    return featured;
  },
});

/**
 * Questions by topic
 */
export const getQuestionsByTopic = query({
  args: {
    topic: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    if (!args.topic || args.topic === "Overview") {
      return await ctx.db.query("questions").take(limit);
    }

    return await ctx.db
      .query("questions")
      .filter((q) => q.eq(q.field("topic"), args.topic))
      .take(limit);
  },
});

/**
 * Save AI generated coding question
 */
export const saveGeneratedQuestion = mutation({
  args: {
    title: v.string(),
    difficulty: v.string(),
    topic: v.string(),
    description: v.string(),
    tags: v.array(v.string()),

    imageUrl: v.optional(v.string()),
    diagramUrl: v.optional(v.string()),
    voiceUrl: v.optional(v.string()),

    startercode_python: v.string(),
    startercode_javascript: v.string(),
    startercode_java: v.string(),
    startercode_cpp: v.string(),
    startercode_typescript: v.string(),

    inputFormat: v.string(),
    outputFormat: v.string(),

    constraints: v.array(v.string()),

    testCases: v.array(
      v.object({
        input: v.any(),
        expected: v.any(),
      }),
    ),

    hidden_testcases: v.optional(
      v.array(
        v.object({
          input: v.any(),
          expected: v.any(),
        }),
      ),
    ),

    timeLimit: v.number(),

    penaltyInterval: v.optional(v.number()),
    penaltyDrop: v.optional(v.number()),
    locked: v.boolean(),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("questions")
      .filter((q) => q.eq(q.field("title"), args.title))
      .first();

    if (existing) {
      return { id: existing._id, duplicate: true };
    }

    const id = await ctx.db.insert("questions", {
      title: args.title,
      difficulty: args.difficulty,
      topic: args.topic,
      description: args.description,
      tags: args.tags,

      imageUrl: args.imageUrl || "",
      diagramUrl: args.diagramUrl || "",
      voiceUrl: args.voiceUrl || "",

      startercode_python: args.startercode_python,
      startercode_javascript: args.startercode_javascript,
      startercode_java: args.startercode_java,
      startercode_cpp: args.startercode_cpp,
      startercode_typescript: args.startercode_typescript,

      inputFormat: args.inputFormat,
      outputFormat: args.outputFormat,

      constraints: args.constraints,

      testCases: args.testCases,

      hidden_testcases: args.hidden_testcases || [],

      timeLimit: args.timeLimit,

      penaltyInterval: args.penaltyInterval,
      penaltyDrop: args.penaltyDrop,
      locked: args.locked,
    });

    return { id, duplicate: false };
  },
});

/**
 * Save AI/ML question
 */
export const saveAiMlQuestion = mutation({
  args: {
    title: v.string(),
    difficulty: v.string(),
    topic: v.string(),
    tags: v.array(v.string()),

    sub_topic: v.optional(v.string()),
    library_focus: v.optional(v.string()),
    description: v.string(),

    imageUrl: v.optional(v.string()),
    diagramUrl: v.optional(v.string()),
    voiceUrl: v.optional(v.string()),

    python_code: v.string(),

    inputFormat: v.string(),
    outputFormat: v.string(),

    constraints: v.array(v.string()),

    testCases: v.array(
      v.object({
        input: v.any(),
        expected: v.any(),
      }),
    ),

    hidden_testcases: v.optional(
      v.array(
        v.object({
          input: v.any(),
          expected: v.any(),
        }),
      ),
    ),

    timeLimit: v.number(),
    memory_limit: v.number(),

    penaltyInterval: v.optional(v.number()),
    penaltyDrop: v.optional(v.number()),

    locked: v.boolean(),
  },

  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aimlQuestions")
      .filter((q) => q.eq(q.field("title"), args.title))
      .first();

    if (existing) {
      return { id: existing._id, duplicate: true };
    }

    const id = await ctx.db.insert("aimlQuestions", {
      title: args.title,
      difficulty: args.difficulty,
      topic: args.topic,
      tags: args.tags,

      sub_topic: args.sub_topic,
      library_focus: args.library_focus,
      description: args.description,

      imageUrl: args.imageUrl || "",
      diagramUrl: args.diagramUrl || "",
      voiceUrl: args.voiceUrl || "",

      python_code: args.python_code,

      inputFormat: args.inputFormat,
      outputFormat: args.outputFormat,

      constraints: args.constraints,

      testCases: args.testCases,
      hidden_testcases: args.hidden_testcases || [],

      timeLimit: args.timeLimit,
      memory_limit: args.memory_limit,

      penaltyInterval: args.penaltyInterval,
      penaltyDrop: args.penaltyDrop,

      locked: args.locked,
    });

    return { id, duplicate: false };
  },
});

/**
 * Update voice narration URL
 */
export const updateQuestionVoice = mutation({
  args: {
    questionId: v.id("questions"),
    voiceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.questionId, {
      voiceUrl: args.voiceUrl,
    });
  },
});
