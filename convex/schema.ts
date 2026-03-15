import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    public_id: v.string(), // numeric public identifier, but string avoids precision issues
    username: v.string(),
    profile_picture: v.optional(v.string()),
    rating: v.number(),
    rank: v.string(),
    coins: v.number(),
    solved_count: v.number(),
    accuracy: v.number(),
    losses: v.optional(v.number()),
    created_at: v.number(),
  })
    .index("by_public_id", ["public_id"])
    .index("by_username", ["username"])
    .index("by_rating", ["rating"]),

  questions: defineTable({
    title: v.string(),
    difficulty: v.string(), // Easy, Medium, Hard, Very Hard, Impossible
    topic: v.string(), // Added for topicStats
    description: v.string(),
    tags: v.array(v.string()),

    imageUrl: v.string(),
    diagramUrl: v.string(),

    voiceUrl: v.string(),

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

    hidden_testcases: v.array(
      v.object({
        input: v.any(),
        expected: v.any(),
      }),
    ),

    timeLimit: v.number(),

    penaltyInterval: v.optional(v.number()),
    penaltyDrop: v.optional(v.number()),
    locked: v.boolean(),
  })
    .index("by_title", ["title"])
    .index("by_difficulty", ["difficulty"]),

  aimlQuestions: defineTable({
    title: v.string(),
    difficulty: v.string(), // Easy, Medium, Hard, Very Hard, Impossible
    topic: v.string(),
    tags: v.array(v.string()),

    sub_topic: v.optional(v.string()),
    library_focus: v.optional(v.string()),

    description: v.string(),

    imageUrl: v.string(),
    diagramUrl: v.string(),

    voiceUrl: v.string(),

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

    hidden_testcases: v.array(
      v.object({
        input: v.any(),
        expected: v.any(),
      }),
    ),

    timeLimit: v.number(),
    memory_limit: v.number(),

    penaltyInterval: v.optional(v.number()),
    penaltyDrop: v.optional(v.number()),

    locked: v.boolean(),
  })
    .index("by_difficulty", ["difficulty"])
    .index("by_topic", ["topic"]),

  submissions: defineTable({
    user_id: v.id("users"),
    question_id: v.id("questions"),
    code: v.string(),
    language: v.string(),
    result: v.string(), // Accepted, Wrong Answer, Time Limit Exceeded, Runtime Error, Compilation Error
    runtime: v.number(), // in ms
    memory: v.number(), // in MB
    submitted_at: v.number(),
  })
    .index("by_user", ["user_id"])
    .index("by_question", ["question_id"])
    .index("by_user_question", ["user_id", "question_id"]),

  matches: defineTable({
    host_id: v.id("users"),
    mode: v.string(),
    difficulty: v.string(),
    number_of_questions: v.number(),
    question_ids: v.optional(v.array(v.id("questions"))),
    time_limit: v.number(),
    allowed_languages: v.array(v.string()),
    visibility: v.string(), // public, private
    status: v.string(), // waiting, countdown, running, finished, cancelled
    created_at: v.number(),
    started_at: v.optional(v.number()),
    ended_at: v.optional(v.number()),
    is_tournament: v.optional(v.boolean()),
    tournament_name: v.optional(v.string()),
    prize_pool: v.optional(v.number()),
    scheduled_for: v.optional(v.number()),
    // Phase 4 additions
    arena_name: v.optional(v.string()),
    invite_code: v.optional(v.string()),
    password: v.optional(v.string()),
    max_players: v.optional(v.number()),
    hosted_by_app: v.optional(v.boolean()),
    is_active: v.optional(v.boolean()),
    question_scores: v.optional(v.record(v.string(), v.number())),
    total_score: v.optional(v.number()),
    // Tournament Secure Tokens & Roles
    organizer_id: v.optional(v.id("users")),
    organizer_ids: v.optional(v.array(v.id("users"))),
    play_token: v.optional(v.string()), // Used for active running tournament
    lobby_token: v.optional(v.string()), // Used for 2min waiting lobby
    organizer_invite_token: v.optional(v.string()),
    organizer_password: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_visibility", ["visibility"])
    .index("by_status_visibility", ["status", "visibility"])
    .index("by_host", ["host_id"])
    .index("by_invite_code", ["invite_code"])
    .index("by_is_active", ["is_active"]),

  matchPlayers: defineTable({
    match_id: v.id("matches"),
    user_id: v.id("users"),
    bot_id: v.optional(v.id("aiBots")),
    is_bot: v.optional(v.boolean()),
    score: v.number(),
    solved_count: v.number(),
    total_time: v.number(),
    attempts: v.number(),
    rank: v.optional(v.number()),
    // Phase 4 additions
    joined_at: v.optional(v.number()),
    time_penalty: v.optional(v.number()),
    questions_unlocked: v.optional(v.number()),
    current_question_index: v.optional(v.number()),
    // Knockout options
    topic_preferences: v.optional(v.string()), // For Knockout personalized topics
    left_match: v.optional(v.boolean()), // Flag if they forfeited/left before finishing
  })
    .index("by_match", ["match_id"])
    .index("by_user", ["user_id"])
    .index("by_match_score", ["match_id", "score"]),

  matchSubmissions: defineTable({
    match_id: v.id("matches"),
    user_id: v.id("users"),
    question_id: v.id("questions"),
    result: v.string(),
    runtime: v.number(),
    memory: v.number(),
    timestamp: v.number(),
    // Phase 4 additions
    code: v.optional(v.string()),
    language: v.optional(v.string()),
    hidden_test_results: v.optional(
      v.object({
        passed: v.number(),
        failed: v.number(),
        total: v.number(),
        details: v.optional(
          v.array(
            v.object({
              input: v.string(),
              expected: v.string(),
              actual: v.optional(v.string()),
              passed: v.boolean(),
            }),
          ),
        ),
      }),
    ),
    ai_analysis: v.optional(
      v.object({
        score: v.number(),
        feedback: v.string(),
        code_quality: v.number(),
        test_case_analysis: v.optional(
          v.array(
            v.object({
              case_name: v.string(),
              status: v.string(),
              explanation: v.string(),
            }),
          ),
        ),
      }),
    ),
    is_locked: v.optional(v.boolean()),
    // Knockout / Fallback Scoring Options
    testcases_passed: v.optional(v.number()),
  })
    .index("by_match", ["match_id"])
    .index("by_match_user", ["match_id", "user_id"]),

  achievements: defineTable({
    name: v.string(),
    icon: v.string(),
    description: v.string(),
  }),

  userAchievements: defineTable({
    user_id: v.id("users"),
    achievement_id: v.id("achievements"),
    earned_at: v.number(),
  }).index("by_user", ["user_id"]),

  leaderboards: defineTable({
    user_id: v.id("users"),
    rating: v.number(),
    rank: v.number(),
    wins: v.number(),
    losses: v.number(),
  })
    .index("by_rating", ["rating"])
    .index("by_user", ["user_id"]),

  aiBots: defineTable({
    name: v.string(),
    rating: v.number(),
    rank: v.string(),
    language_speciality: v.string(),
    avatar_url: v.optional(v.string()),
  })
    .index("by_name", ["name"])
    .index("by_rating", ["rating"]),

  // ====== PHASE 3: ML & RECOMMENDATION TABLES ======

  // Per-user, per-topic performance tracking for ML recommendations
  userTopicStats: defineTable({
    user_id: v.id("users"),
    topic: v.string(),
    total_attempts: v.number(),
    solved_count: v.number(),
    success_rate: v.number(), // 0-100
    avg_time: v.number(), // avg seconds to solve
    avg_difficulty: v.number(), // avg numeric difficulty of solved problems
    last_attempted: v.number(), // timestamp
  })
    .index("by_user", ["user_id"])
    .index("by_user_topic", ["user_id", "topic"]),

  // Problem-level popularity metrics for trending & recommendations
  problemPopularity: defineTable({
    question_id: v.id("questions"),
    total_attempts: v.number(),
    solve_count: v.number(),
    solve_rate: v.number(), // 0-100
    recent_solves_7d: v.number(), // solves in last 7 days
  })
    .index("by_question", ["question_id"])
    .index("by_recent_solves", ["recent_solves_7d"]),

  // Real-time matchmaking queue
  matchmakingQueue: defineTable({
    user_id: v.id("users"),
    rating: v.number(),
    mode: v.string(), // "ranked", "casual"
    difficulty: v.string(),
    joined_at: v.number(),
  })
    .index("by_rating", ["rating"])
    .index("by_mode", ["mode"]),

  // Daily challenge rotation
  dailyChallenge: defineTable({
    question_id: v.id("questions"),
    date: v.string(), // "2026-03-10"
    topic: v.string(),
  }).index("by_date", ["date"]),

  // ====== PHASE 4: ARENA & TOURNAMENT TABLES ======

  // AI-hosted arena event log
  arenaEvents: defineTable({
    event_date: v.string(),
    event_type: v.string(),
    match_id: v.optional(v.id("matches")),
    decided_by_ai: v.boolean(),
    ai_reasoning: v.optional(v.string()),
  }).index("by_date", ["event_date"]),

  // Ephemeral arena chat — auto-deleted when match ends
  arenaChat: defineTable({
    match_id: v.id("matches"),
    user_id: v.id("users"),
    message: v.string(),
    sent_at: v.number(),
  })
    .index("by_match", ["match_id"])
    .index("by_match_time", ["match_id", "sent_at"]),

  // ====== KNOCKOUT & TOURNAMENT BRACKETS ======

  // Tree nodes for 1v1 execution inside a larger Knockout event
  matchBrackets: defineTable({
    match_id: v.id("matches"),
    round: v.number(), // 1 = first 1v1s, ascending towards finals
    match_index: v.number(), // position within the round
    player1_id: v.optional(v.id("users")), // can be null if pending
    player2_id: v.optional(v.id("users")),
    winner_id: v.optional(v.id("users")),
    next_match_index: v.optional(v.number()), // which match in (round+1) the winner goes to
    question_id: v.optional(v.id("questions")), // custom combined-topic question
    status: v.string(), // "waiting", "running", "completed"
  })
    .index("by_match", ["match_id"])
    .index("by_round", ["match_id", "round"]),
});
