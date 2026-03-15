import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getRankTier, calculateMultiplayerElo } from "./elo";

// Helper to get user by public_id
const getUserByPublicId = async (ctx: any, public_id: string) => {
  return await ctx.db
    .query("users")
    .withIndex("by_public_id", (q: any) => q.eq("public_id", public_id))
    .first();
};

export const getOpenArenas = query({
  args: {},
  handler: async (ctx) => {
    // Fetch public, active, waiting matches
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_status_visibility", (q) =>
        q.eq("status", "waiting").eq("visibility", "public"),
      )
      .collect();

    // Filter to only active arenas — exclude tournaments
    const activeMatches = matches.filter(
      (m) => m.is_active !== false && !m.is_tournament,
    );

    // Enhance matches with player count and host username
    const matchesWithPlayers = await Promise.all(
      activeMatches.slice(0, 30).map(async (m) => {
        const players = await ctx.db
          .query("matchPlayers")
          .withIndex("by_match", (q) => q.eq("match_id", m._id))
          .collect();
        const host = await ctx.db.get(m.host_id);
        const maxPlayers =
          m.max_players ||
          (m.mode === "1v1 Duel" ? 2 : m.mode === "Battle Royale" ? 50 : 20);
        return {
          ...m,
          playerCount: players.length,
          maxPlayers,
          hostUsername: host?.username || "Unknown",
        };
      }),
    );

    return matchesWithPlayers;
  },
});

export const createMatch = mutation({
  args: {
    public_id: v.string(),
    mode: v.string(),
    difficulty: v.string(),
    time_limit: v.number(),
    allowed_languages: v.array(v.string()),
    visibility: v.string(),
    number_of_questions: v.number(),
    arena_name: v.optional(v.string()),
    password: v.optional(v.string()),
    max_players: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) throw new Error("User not found");

    // Generate 6-char invite code
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let invite_code = "";
    for (let i = 0; i < 6; i++) {
      invite_code += chars[Math.floor(Math.random() * chars.length)];
    }

    const matchId = await ctx.db.insert("matches", {
      host_id: user._id,
      mode: args.mode,
      difficulty: args.difficulty,
      number_of_questions: args.number_of_questions,
      time_limit: args.time_limit,
      allowed_languages: args.allowed_languages,
      visibility: args.visibility,
      status: "waiting",
      created_at: Date.now(),
      arena_name: args.arena_name || `${args.difficulty} Arena`,
      invite_code,
      password: args.visibility === "private" ? args.password : undefined,
      max_players:
        args.max_players ||
        (args.mode === "1v1 Duel"
          ? 2
          : args.mode === "Battle Royale"
            ? 50
            : 20),
      is_active: true,
    });

    // Auto join host
    await ctx.db.insert("matchPlayers", {
      match_id: matchId,
      user_id: user._id,
      score: 0,
      solved_count: 0,
      total_time: 0,
      attempts: 0,
      joined_at: Date.now(),
      questions_unlocked: 1,
      current_question_index: 0,
    });

    return matchId;
  },
});

export const joinMatch = mutation({
  args: {
    public_id: v.string(),
    match_id: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) throw new Error("User not found");

    const match = await ctx.db.get(args.match_id);
    if (!match || (match.status !== "waiting" && match.status !== "running")) {
      throw new Error("Match unavailable or already finished");
    }

    const existingPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    const maxPlayers =
      match.max_players ||
      (match.mode === "1v1 Duel"
        ? 2
        : match.mode === "Battle Royale"
          ? 50
          : 20);

    if (existingPlayers.length >= maxPlayers) {
      throw new Error("Match is full!");
    }

    const existingPlayer = existingPlayers.find((p) => p.user_id === user._id);

    if (!existingPlayer) {
      // Calculate late-joiner penalty
      let timePenalty = 0;
      if (match.status === "running" && match.started_at) {
        timePenalty = Math.floor((Date.now() - match.started_at) / 1000);
      }

      await ctx.db.insert("matchPlayers", {
        match_id: args.match_id,
        user_id: user._id,
        score: 0,
        solved_count: 0,
        total_time: 0,
        attempts: 0,
        joined_at: Date.now(),
        time_penalty: timePenalty,
        questions_unlocked: 1,
        current_question_index: 0,
      });
    }

    return true;
  },
});

export const leaveMatch = mutation({
  args: {
    public_id: v.string(),
    match_id: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) return false;

    const match = await ctx.db.get(args.match_id);
    if (!match) return false;

    const playerRecord = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .filter((q) => q.eq(q.field("user_id"), user._id))
      .first();

    if (playerRecord) {
      if (match.status === "running") {
        // If the match is running, we act as a forfeit unless they already successfully submitted
        const successfulSubmission = await ctx.db
          .query("matchSubmissions")
          .withIndex("by_match_user", (q) =>
            q.eq("match_id", args.match_id).eq("user_id", user._id),
          )
          .filter((q) => q.eq(q.field("result"), "Accepted"))
          .first();

        // If they haven't finished their code securely, mark them as having fled
        if (!successfulSubmission) {
          await ctx.db.patch(playerRecord._id, { left_match: true });
        }
      } else {
        // If waiting/cancelled/finished, just delete the record entirely
        await ctx.db.delete(playerRecord._id);
      }
    }

    // Get remaining players
    const remainingPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    // Remove from remaining list for logic
    const activeRemaining = remainingPlayers.filter(
      (p) => p.user_id !== user._id && !p.left_match,
    );

    if (activeRemaining.length === 0 && match.status !== "finished") {
      // No active players remain — cancel the arena
      await ctx.db.patch(args.match_id, {
        status: "cancelled",
        is_active: false,
      });
      const chats = await ctx.db
        .query("arenaChat")
        .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
        .collect();
      for (const c of chats) await ctx.db.delete(c._id);
    } else if (match.host_id === user._id) {
      // Host is leaving — transfer host to the earliest-joined remaining player
      const sorted = activeRemaining.sort(
        (a, b) => (a.joined_at || 0) - (b.joined_at || 0),
      );
      const newHost = sorted[0];
      if (newHost) {
        await ctx.db.patch(args.match_id, { host_id: newHost.user_id });
      }
    }

    return true;
  },
});

export const getMatchDetails = query({
  args: {
    match_id: v.id("matches"),
    public_id: v.optional(v.string()), // Used to check if they're a player to allow them past the wall
    lobby_token: v.optional(v.string()), // Required if waiting tournament
    play_token: v.optional(v.string()), // Required if running tournament
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.match_id);
    if (!match) return null;

    let user: any = null;
    if (args.public_id) {
      const pid = args.public_id; // Explicit string mapping to help TypeScript
      user = await ctx.db
        .query("users")
        .withIndex("by_public_id", (q) => q.eq("public_id", pid))
        .first();
    }

    const playerRecords = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    // STRICT TOKEN WALL FOR TOURNAMENTS
    if (match.is_tournament) {
      const isPlayer = user
        ? playerRecords.some((p) => p.user_id === user._id)
        : false;
      const isOrg = user ? match.organizer_ids?.includes(user._id) : false;

      if (match.status === "waiting") {
        if (!isOrg) {
          if (!isPlayer)
            throw new Error(
              "Access Denied: You are not a registered participant.",
            );
          if (args.lobby_token !== match.lobby_token)
            throw new Error("Access Denied: Invalid lobby token.");
        }
      } else if (match.status === "running") {
        if (args.play_token !== match.play_token) {
          throw new Error("Access Denied: Invalid play token.");
        }
      }
    }

    const players = await Promise.all(
      playerRecords.map(async (p) => {
        const u = await ctx.db.get(p.user_id);
        return {
          ...p,
          username: u?.username || "Unknown",
          rating: u?.rating || 0,
          profile_picture: u?.profile_picture,
          left_match: p.left_match || false,
        };
      }),
    );

    return { match, players };
  },
});

export const updateMatchStatus = mutation({
  args: {
    match_id: v.id("matches"),
    status: v.string(), // "countdown", "running", "finished"
  },
  handler: async (ctx, args) => {
    const updates: any = { status: args.status };
    if (args.status === "running") updates.started_at = Date.now();
    if (args.status === "finished") updates.ended_at = Date.now();

    await ctx.db.patch(args.match_id, updates);
    return true;
  },
});

export const startMatch = mutation({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.match_id);
    if (!match) throw new Error("Match not found");

    if (match.is_tournament) {
      // Check participants
      const players = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
        .collect();

      const isViable =
        players.length >= 2 ||
        (players.length === 1 && players[0].user_id !== match.host_id);
      if (!isViable) {
        await ctx.db.patch(args.match_id, {
          status: "cancelled",
          is_active: false,
        });
        throw new Error("Tournament cancelled: Not enough players joined.");
      }
    }

    let players = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    // KNOCKOUT LOGIC: Must be even number of players. Remove the last player if odd.
    if (
      match.mode === "Knockout" &&
      players.length % 2 !== 0 &&
      players.length > 0
    ) {
      // Sort by joined_at descending, pop the last joined player
      players.sort((a, b) => (b.joined_at || 0) - (a.joined_at || 0));
      const playerToKick = players[0]; // The most recently joined
      await ctx.db.delete(playerToKick._id);
      players = players.slice(1);
    }

    // Fetch random questions based on difficulty
    const allQuestions = await ctx.db
      .query("questions")
      .withIndex("by_difficulty", (q) => q.eq("difficulty", match.difficulty))
      .filter((q) => q.eq(q.field("locked"), false)) // ensure not locked
      .collect();

    if (allQuestions.length === 0) {
      throw new Error(
        "No questions available for this difficulty. Please seed questions first.",
      );
    }

    // Shuffle and pick
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, match.number_of_questions);

    // Filter by topic if Knockout mode
    if (match.mode === "Knockout") {
      // Bracket generation
      players.sort(() => 0.5 - Math.random()); // randomize seeding
      let matchIndex = 0;

      for (let i = 0; i < players.length; i += 2) {
        const p1 = players[i];
        const p2 = players[i + 1];

        let qId = selected[0]?._id;

        // Try to find a custom question matching preferences
        const prefs = [p1?.topic_preferences, p2?.topic_preferences]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (prefs) {
          const preferedQuestion = allQuestions.find((q) =>
            prefs.includes(q.topic.toLowerCase()),
          );
          if (preferedQuestion) qId = preferedQuestion._id;
        }

        if (p1 && p2) {
          await ctx.db.insert("matchBrackets", {
            match_id: args.match_id,
            round: 1,
            match_index: matchIndex,
            player1_id: p1.user_id,
            player2_id: p2.user_id,
            question_id: qId,
            status: "running",
            next_match_index: Math.floor(matchIndex / 2),
          });
          matchIndex++;
        }
      }

      // Generate deeper rounds
      let currentRoundMatches = matchIndex;
      let currentRound = 2;
      while (currentRoundMatches > 1) {
        let nextRoundMatches = Math.ceil(currentRoundMatches / 2);
        for (let i = 0; i < nextRoundMatches; i++) {
          await ctx.db.insert("matchBrackets", {
            match_id: args.match_id,
            round: currentRound,
            match_index: i,
            status: "waiting",
            next_match_index:
              nextRoundMatches > 1 ? Math.floor(i / 2) : undefined,
          });
        }
        currentRoundMatches = nextRoundMatches;
        currentRound++;
      }
    }

    const question_ids = selected.map((q) => q._id);

    await ctx.db.patch(args.match_id, {
      status: "running",
      started_at: Date.now(),
      question_ids: question_ids,
    });

    return true;
  },
});

export const getMatchQuestions = query({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.match_id);
    if (!match || !match.question_ids) return [];

    const questions = await Promise.all(
      match.question_ids.map((id) => ctx.db.get(id)),
    );
    return questions.filter(Boolean);
  },
});

export const submitMatchQuestion = mutation({
  args: {
    match_id: v.id("matches"),
    public_id: v.string(),
    question_id: v.id("questions"),
    score_earned: v.number(),
    time_taken: v.number(), // in seconds
    is_correct: v.boolean(),
    result: v.string(),
    runtime: v.number(),
    memory: v.number(),
    testcases_passed: v.optional(v.number()), // added for fallback scoring
    code: v.optional(v.string()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) return false;

    const match = await ctx.db.get(args.match_id);
    if (!match) return false;

    const playerRecord = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .filter((q) => q.eq(q.field("user_id"), user._id))
      .first();

    if (!playerRecord) return false;

    // Check if already submitted for this question (locked)
    const existingSub = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_match_user", (q) =>
        q.eq("match_id", args.match_id).eq("user_id", user._id),
      )
      .filter((q) => q.eq(q.field("question_id"), args.question_id))
      .filter((q) => q.eq(q.field("is_locked"), true))
      .first();
    if (existingSub) return false; // Already locked — can't re-submit

    // Apply penalties and scores
    const newAttempts = playerRecord.attempts + 1;
    let newScore = playerRecord.score;
    let newSolved = playerRecord.solved_count;
    let penalty = 0;

    if (!args.is_correct) {
      penalty = 20; // 20 seconds penalty for wrong submission
    } else {
      newScore += args.score_earned;
      newSolved += 1;
    }

    // Unlock next question if correct
    const currentUnlocked = playerRecord.questions_unlocked || 1;
    const totalQuestions = match.number_of_questions || 1;
    const newUnlocked = args.is_correct
      ? Math.min(currentUnlocked + 1, totalQuestions)
      : currentUnlocked;

    await ctx.db.patch(playerRecord._id, {
      score: newScore,
      solved_count: newSolved,
      total_time: playerRecord.total_time + args.time_taken + penalty,
      attempts: newAttempts,
      questions_unlocked: newUnlocked,
      current_question_index: args.is_correct
        ? Math.min(
            (playerRecord.current_question_index || 0) + 1,
            totalQuestions - 1,
          )
        : playerRecord.current_question_index || 0,
    });

    // Log the submission with code — mark as locked
    await ctx.db.insert("matchSubmissions", {
      match_id: args.match_id,
      user_id: user._id,
      question_id: args.question_id,
      result: args.result,
      runtime: args.runtime,
      memory: args.memory,
      timestamp: Date.now(),
      code: args.code,
      language: args.language,
      is_locked: true,
      testcases_passed: args.testcases_passed,
    });

    return true;
  },
});

export const finishMatch = mutation({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.match_id);
    if (!match || match.status === "finished") return false;

    const playersRecords = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    // Fetch current ratings (include is_bot and left_match flags)
    const playersWithRatings = await Promise.all(
      playersRecords.map(async (pr) => {
        const user = await ctx.db.get(pr.user_id);
        return {
          id: pr.user_id as string,
          rating: user?.rating || 500,
          score: pr.score || 0,
          user,
          is_bot: pr.is_bot || false,
          left_match: pr.left_match || false,
        };
      }),
    );

    // Calculate ELO changes
    const eloChanges = calculateMultiplayerElo(playersWithRatings);

    // Determine winner purely based on highest score among participants (excluding those who left)
    const activePlayers = playersWithRatings.filter((p) => !p.left_match);
    const maxScore =
      activePlayers.length > 0
        ? Math.max(...activePlayers.map((p) => p.score))
        : 0;

    // Update users and leaderboards (skip bots)
    for (const pr of playersWithRatings) {
      if (!pr.user || pr.is_bot) continue;
      const user = pr.user;

      const newRating = Math.max(0, pr.rating + (eloChanges[pr.id] || 0));
      const newRank = getRankTier(newRating);

      // A player only wins if they didn't leave, they scored the max score, their score > 0, and there are multiple players
      const isWinner =
        !pr.left_match &&
        pr.score > 0 &&
        pr.score === maxScore &&
        playersWithRatings.length > 1;
      const coinReward = isWinner ? match.prize_pool || 100 : 20;

      await ctx.db.patch(user._id, {
        rating: newRating,
        rank: newRank,
        coins: (user.coins || 0) + coinReward,
        losses: (user.losses || 0) + (!isWinner ? 1 : 0), // Global standard user losses
      });

      // Update leaderboard (specific to multiplayer stats)
      const lb = await ctx.db
        .query("leaderboards")
        .withIndex("by_user", (q) => q.eq("user_id", user._id))
        .first();
      if (lb) {
        await ctx.db.patch(lb._id, {
          rating: newRating,
          wins: (lb.wins || 0) + (isWinner ? 1 : 0),
          losses: (lb.losses || 0) + (!isWinner ? 1 : 0),
        });
      } else {
        await ctx.db.insert("leaderboards", {
          user_id: user._id,
          rating: newRating,
          rank: 0,
          wins: isWinner ? 1 : 0,
          losses: !isWinner && playersWithRatings.length > 1 ? 1 : 0,
        });
      }
    }

    await ctx.db.patch(args.match_id, {
      status: "finished",
      ended_at: Date.now(),
      is_active: false,
    });

    // Auto-purge arena chat to save space
    const chats = await ctx.db
      .query("arenaChat")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();
    for (const c of chats) await ctx.db.delete(c._id);

    return true;
  },
});

export const getUpcomingTournaments = query({
  args: {
    public_id: v.optional(v.string()),
    lobby_token: v.optional(v.string()),
    play_token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user: any = null;
    if (args.public_id) {
      user = await ctx.db
        .query("users")
        .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id!))
        .first();
    }

    const waitingMatches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) => q.eq(q.field("is_tournament"), true))
      .collect();

    const runningMatchesRaw = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "running"))
      .filter((q) => q.eq(q.field("is_tournament"), true))
      .collect();

    const now = Date.now();

    // Filter out waiting matches that are dead/abandoned.
    // Hide if more than 3 minutes past scheduled_for and still "waiting".
    const validWaiting = waitingMatches.filter((m) => {
      if (!m.scheduled_for) return true;
      return now < m.scheduled_for + 3 * 60 * 1000;
    });

    // Filter out running matches that have exceeded their time limit + 5 min grace
    const validRunning = runningMatchesRaw.filter((m) => {
      if (!m.started_at || !m.time_limit) return true;
      const endTime = m.started_at + m.time_limit * 1000 + 5 * 60 * 1000;
      return now < endTime;
    });

    const matches = [...validWaiting, ...validRunning];

    const tournaments = await Promise.all(
      matches.map(async (m) => {
        const players = await ctx.db
          .query("matchPlayers")
          .withIndex("by_match", (q) => q.eq("match_id", m._id))
          .collect();

        const isRegistered = user
          ? players.some((p) => p.user_id === user._id)
          : false;
        const isHost = user ? m.host_id === user._id : false;

        return {
          ...m,
          playerCount: players.length,
          maxPlayers: 100,
          isRegistered,
          isHost,
        };
      }),
    );

    return tournaments.sort(
      (a, b) => (a.scheduled_for || 0) - (b.scheduled_for || 0),
    );
  },
});

export const seedTournaments = mutation({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) => q.eq(q.field("is_tournament"), true))
      .collect();

    if (existing.length > 0) return "Tournaments already scheduled";

    const nextWeekend = Date.now() + 3 * 24 * 60 * 60 * 1000; // 3 days from now
    const GrandPrixId = await ctx.db.insert("matches", {
      host_id: user._id,
      mode: "Tournament",
      difficulty: "Hard",
      number_of_questions: 4,
      time_limit: 3600, // 60 mins
      allowed_languages: ["JavaScript", "Python", "Java", "C++"],
      visibility: "public",
      status: "waiting",
      created_at: Date.now(),
      is_tournament: true,
      tournament_name: "Weekly Grand Prix",
      prize_pool: 5000,
      scheduled_for: nextWeekend,
    });

    const BlitzId = await ctx.db.insert("matches", {
      host_id: user._id,
      mode: "Tournament",
      difficulty: "Medium",
      number_of_questions: 6,
      time_limit: 1800, // 30 mins
      allowed_languages: ["JavaScript", "Python", "Java", "C++"],
      visibility: "public",
      status: "waiting",
      created_at: Date.now(),
      is_tournament: true,
      tournament_name: "Sunday Blitz",
      prize_pool: 2500,
      scheduled_for: nextWeekend + 24 * 60 * 60 * 1000,
    });

    return "Tournaments seeded";
  },
});

export const getMatchSubmissions = query({
  args: { match_id: v.id("matches"), public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q: any) => q.eq("public_id", args.public_id))
      .first();
    if (!user) return [];

    const submissions = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_match_user", (q) =>
        q.eq("match_id", args.match_id).eq("user_id", user._id),
      )
      .collect();

    return submissions.sort((a, b) => a.timestamp - b.timestamp);
  },
});

export const addBotPlayer = mutation({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    // Pick a random bot from the aiBots table
    const allBots = await ctx.db.query("aiBots").collect();
    if (allBots.length === 0)
      throw new Error("No bots available. Run seedBots first.");

    const bot = allBots[Math.floor(Math.random() * allBots.length)];

    // We still need a user_id for the matchPlayers record — create a
    // lightweight placeholder user (won't appear in leaderboards because
    // the is_bot flag is set and finishMatch skips bots).
    const botPublicId = "bot_" + Math.random().toString(36).substr(2, 6);
    const botUserId = await ctx.db.insert("users", {
      public_id: botPublicId,
      username: bot.name,
      profile_picture: bot.avatar_url,
      rating: bot.rating,
      rank: bot.rank,
      coins: 0,
      solved_count: 0,
      accuracy: 100,
      created_at: Date.now(),
    });

    await ctx.db.insert("matchPlayers", {
      match_id: args.match_id,
      user_id: botUserId,
      bot_id: bot._id,
      is_bot: true,
      score: 0,
      solved_count: 0,
      total_time: 0,
      attempts: 0,
    });
  },
});

export const updateBotScore = mutation({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.match_id);
    if (!match || match.status !== "running") return;

    const players = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();
    // find bot players via the is_bot flag
    for (const p of players) {
      if (p.is_bot) {
        await ctx.db.patch(p._id, {
          score: p.score + (Math.floor(Math.random() * 50) + 50),
          solved_count: p.solved_count + 1,
          total_time: p.total_time + 40,
          attempts: p.attempts + 1,
        });
      }
    }
  },
});

// Live standings for arena IDE — lightweight reactive query
export const getMatchStandings = query({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    const playerRecords = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    const standings = await Promise.all(
      playerRecords
        .filter((p) => !p.is_bot) // Exclude bots from visible standings
        .map(async (p) => {
          const user = await ctx.db.get(p.user_id);
          return {
            _id: p._id,
            user_id: p.user_id,
            public_id: user?.public_id || "",
            username: user?.username || "Unknown",
            profile_picture: user?.profile_picture,
            score: p.score,
            solved_count: p.solved_count,
            total_time: p.total_time,
            attempts: p.attempts,
            rank: p.rank,
          };
        }),
    );

    // Sort by score desc, then by total_time asc (faster = better)
    return standings.sort(
      (a, b) => b.score - a.score || a.total_time - b.total_time,
    );
  },
});

// ====== PHASE 4: ARENA MANAGEMENT ======

// Join a match by invite code (for private arenas)
export const joinMatchByInviteCode = mutation({
  args: {
    public_id: v.string(),
    invite_code: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) throw new Error("User not found");

    const match = await ctx.db
      .query("matches")
      .withIndex("by_invite_code", (q) =>
        q.eq("invite_code", args.invite_code.toUpperCase()),
      )
      .first();

    if (!match) throw new Error("Invalid invite code");
    if (match.status !== "waiting" && match.status !== "running") {
      throw new Error("This arena is no longer available");
    }
    if (match.is_active === false) {
      throw new Error("This arena has been closed");
    }

    // Password check for private arenas
    if (match.password && match.password !== args.password) {
      throw new Error("Incorrect password");
    }

    const existingPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", match._id))
      .collect();

    const maxPlayers = match.max_players || 20;
    if (existingPlayers.length >= maxPlayers) {
      throw new Error("Arena is full!");
    }

    const alreadyJoined = existingPlayers.find((p) => p.user_id === user._id);
    if (alreadyJoined) {
      return match._id; // Already in, just return match ID
    }

    // Create player record without penalty
    await ctx.db.insert("matchPlayers", {
      match_id: match._id,
      user_id: user._id,
      score: 0,
      solved_count: 0,
      total_time: 0,
      attempts: 0,
      joined_at: Date.now(),
      questions_unlocked: 1,
      current_question_index: 0,
    });

    return match._id;
  },
});

// Look up arena by invite code (for preview before joining)
export const getArenaByInviteCode = query({
  args: { invite_code: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query("matches")
      .withIndex("by_invite_code", (q) =>
        q.eq("invite_code", args.invite_code.toUpperCase()),
      )
      .first();

    if (!match || match.is_active === false) return null;

    const players = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", match._id))
      .collect();

    return {
      ...match,
      playerCount: players.length,
      maxPlayers: match.max_players || 20,
      hasPassword: !!match.password,
      // Don't expose the actual password
      password: undefined,
    };
  },
});

// Close/cancel arena — host only
export const closeArena = mutation({
  args: {
    public_id: v.string(),
    match_id: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) throw new Error("User not found");

    const match = await ctx.db.get(args.match_id);
    if (!match) throw new Error("Match not found");
    if (match.host_id !== user._id)
      throw new Error("Only the host can close this arena");
    if (match.status === "finished") throw new Error("Match already finished");

    // Mark as cancelled and inactive
    await ctx.db.patch(args.match_id, {
      status: "cancelled",
      is_active: false,
      ended_at: Date.now(),
    });

    // Remove all players
    const allPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();
    for (const p of allPlayers) {
      await ctx.db.delete(p._id);
    }

    // Purge chat
    const chats = await ctx.db
      .query("arenaChat")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();
    for (const c of chats) await ctx.db.delete(c._id);

    return true;
  },
});

// Get arenas hosted by current user (excludes tournaments by default, separating them)
export const getHostedArenas = query({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q: any) => q.eq("public_id", args.public_id))
      .first();
    if (!user) return [];

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_host", (q) => q.eq("host_id", user._id))
      .collect();

    // Return active hosted arenas (exclude tournaments to keep them separate)
    const activeHosted = matches.filter(
      (m) =>
        m.is_active !== false && m.status !== "finished" && !m.is_tournament,
    );

    return Promise.all(
      activeHosted.map(async (m) => {
        const players = await ctx.db
          .query("matchPlayers")
          .withIndex("by_match", (q) => q.eq("match_id", m._id))
          .collect();
        return {
          ...m,
          playerCount: players.length,
          maxPlayers: m.max_players || 20,
        };
      }),
    );
  },
});

// Send a chat message in an arena
export const sendArenaChat = mutation({
  args: {
    public_id: v.string(),
    match_id: v.id("matches"),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) throw new Error("User not found");

    // Validate user is in the match
    const playerRecord = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .filter((q) => q.eq(q.field("user_id"), user._id))
      .first();
    if (!playerRecord) throw new Error("You are not in this arena");

    // Limit message length
    const trimmed = args.message.trim().slice(0, 500);
    if (!trimmed) return;

    await ctx.db.insert("arenaChat", {
      match_id: args.match_id,
      user_id: user._id,
      message: trimmed,
      sent_at: Date.now(),
    });
  },
});

// Get chat messages for an arena (latest 100)
export const getArenaChat = query({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("arenaChat")
      .withIndex("by_match_time", (q) => q.eq("match_id", args.match_id))
      .order("desc")
      .take(100);

    // Enrich with usernames
    const enriched = await Promise.all(
      messages.map(async (msg) => {
        const user = await ctx.db.get(msg.user_id);
        return {
          ...msg,
          username: user?.username || "Unknown",
          profile_picture: user?.profile_picture,
        };
      }),
    );

    return enriched.reverse(); // chronological order
  },
});

// Manual chat purge (admin/cleanup)
export const purgeArenaChat = mutation({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    const chats = await ctx.db
      .query("arenaChat")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();
    for (const c of chats) await ctx.db.delete(c._id);
    return chats.length;
  },
});

// Get player's current state in a match (for Arena Home)
export const getPlayerState = query({
  args: {
    match_id: v.id("matches"),
    public_id: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q: any) => q.eq("public_id", args.public_id))
      .first();
    if (!user) return null;

    const playerRecord = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .filter((q) => q.eq(q.field("user_id"), user._id))
      .first();

    if (!playerRecord) return null;

    // Get this player's submissions
    const submissions = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_match_user", (q) =>
        q.eq("match_id", args.match_id).eq("user_id", user._id),
      )
      .collect();

    // Build a map of questionId -> submission status
    const submittedQuestions: Record<
      string,
      { result: string; is_locked: boolean; score?: number }
    > = {};
    for (const sub of submissions) {
      if (sub.is_locked) {
        submittedQuestions[sub.question_id] = {
          result: sub.result,
          is_locked: true,
        };
      }
    }

    return {
      ...playerRecord,
      submittedQuestions,
    };
  },
});

// Register for a tournament (no join until scheduled time)
export const registerForTournament = mutation({
  args: {
    public_id: v.string(),
    match_id: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) throw new Error("User not found");

    const match = await ctx.db.get(args.match_id);
    if (!match || !match.is_tournament) throw new Error("Not a tournament");
    if (match.status !== "waiting")
      throw new Error("Tournament already started or finished");

    // Check if already registered
    const existing = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .filter((q) => q.eq(q.field("user_id"), user._id))
      .first();

    if (existing) return "already_registered";

    await ctx.db.insert("matchPlayers", {
      match_id: args.match_id,
      user_id: user._id,
      score: 0,
      solved_count: 0,
      total_time: 0,
      attempts: 0,
      joined_at: Date.now(),
      time_penalty: 0,
      questions_unlocked: 1,
      current_question_index: 0,
    });

    return "registered";
  },
});

// Start tournament — called when scheduled time arrives
export const startTournament = mutation({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.match_id);
    if (!match || !match.is_tournament) throw new Error("Not a tournament");
    if (match.status !== "waiting") return false;

    // Fetch questions by difficulty progression (Medium -> Hard -> Very Hard -> Impossible)
    const difficulties = ["Medium", "Hard", "Very Hard"];
    const allQuestions: any[] = [];

    for (const diff of difficulties) {
      const qs = await ctx.db
        .query("questions")
        .withIndex("by_difficulty", (q) => q.eq("difficulty", diff))
        .filter((q) => q.eq(q.field("locked"), false))
        .collect();
      allQuestions.push(...qs);
    }

    if (allQuestions.length === 0) {
      throw new Error("No questions available for tournament");
    }

    // Group by difficulty and pick proportionally
    const grouped: Record<string, any[]> = {};
    for (const q of allQuestions) {
      if (!grouped[q.difficulty]) grouped[q.difficulty] = [];
      grouped[q.difficulty].push(q);
    }

    // Auto-cancel if there's less than 2 actual registered competitors
    const players = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    if (players.length < 2) {
      await ctx.db.patch(args.match_id, {
        status: "cancelled",
        is_active: false,
      });
      return false; // Automatically cancelled
    }

    const selected: any[] = [];
    const numQ = match.number_of_questions || 4;

    // Distribute: try to get progressive difficulty
    for (const diff of difficulties) {
      const pool = grouped[diff] || [];
      const shuffled = pool.sort(() => 0.5 - Math.random());
      const take = Math.ceil(numQ / difficulties.length);
      selected.push(...shuffled.slice(0, take));
      if (selected.length >= numQ) break;
    }

    const question_ids = selected.slice(0, numQ).map((q) => q._id);

    // Calculate question scores (progressive: 100, 200, 300, 400...)
    const questionScores: Record<string, number> = {};
    let totalScore = 0;
    question_ids.forEach((id, i) => {
      const score = (i + 1) * 100;
      questionScores[id as string] = score;
      totalScore += score;
    });

    // Generate a secure, hard-to-guess play_token for the match route
    const play_tokenChars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let play_token = "";
    for (let i = 0; i < 32; i++) {
      play_token +=
        play_tokenChars[Math.floor(Math.random() * play_tokenChars.length)];
    }

    await ctx.db.patch(args.match_id, {
      status: "running",
      started_at: Date.now(),
      question_ids,
      question_scores: questionScores,
      total_score: totalScore,
      play_token, // The blind link token
    });

    return true;
  },
});

// Create tournament — available for 1800+ rated users
export const createTournament = mutation({
  args: {
    public_id: v.string(),
    tournament_name: v.string(),
    difficulty: v.string(),
    number_of_questions: v.number(),
    time_limit: v.number(),
    prize_pool: v.optional(v.number()),
    scheduled_for: v.number(),
    role: v.optional(v.string()),
    organizer_password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) throw new Error("User not found");

    if ((user.rating || 0) < 1800) {
      throw new Error("You need a rating of 1800+ to create tournaments");
    }

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let invite_code = "";
    for (let i = 0; i < 6; i++) {
      invite_code += chars[Math.floor(Math.random() * chars.length)];
    }

    // Generate Lobby & Organizer tokens
    const genToken = (len: number) => {
      const c =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
      let t = "";
      for (let i = 0; i < len; i++)
        t += c[Math.floor(Math.random() * c.length)];
      return t;
    };

    const lobby_token = genToken(24);
    const organizer_invite_token = genToken(24);

    const isOrganizer = args.role === "organizer";

    const matchId = await ctx.db.insert("matches", {
      host_id: user._id,
      mode: "Tournament",
      difficulty: args.difficulty,
      number_of_questions: args.number_of_questions,
      time_limit: args.time_limit,
      allowed_languages: ["JavaScript", "Python", "Java", "C++"],
      visibility: "public",
      status: "waiting",
      created_at: Date.now(),
      is_tournament: true,
      tournament_name: args.tournament_name,
      prize_pool: args.prize_pool || 1000,
      scheduled_for: args.scheduled_for,
      invite_code,
      is_active: true,
      lobby_token,
      organizer_invite_token,
      organizer_id: isOrganizer ? user._id : undefined,
      organizer_ids: isOrganizer ? [user._id] : undefined,
      organizer_password: isOrganizer
        ? args.organizer_password || undefined
        : undefined,
    });

    // Auto-register creator only if they chose competitor
    if (!isOrganizer) {
      await ctx.db.insert("matchPlayers", {
        match_id: matchId,
        user_id: user._id,
        score: 0,
        solved_count: 0,
        total_time: 0,
        attempts: 0,
        joined_at: Date.now(),
        time_penalty: 0,
        questions_unlocked: 1,
        current_question_index: 0,
      });
    }

    return matchId;
  },
});

// Allow someone to become an organizer with the right token + password
export const addOrganizerToTournament = mutation({
  args: {
    public_id: v.string(),
    organizer_invite_token: v.string(),
    organizer_password: v.string(), // mandatory
  },
  handler: async (ctx, args) => {
    const user = await getUserByPublicId(ctx, args.public_id);
    if (!user) throw new Error("User not found");

    const match = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .filter((q) =>
        q.eq(q.field("organizer_invite_token"), args.organizer_invite_token),
      )
      .first();

    // Check running matches as well if they joined late
    let foundMatch = match;
    if (!foundMatch) {
      foundMatch = await ctx.db
        .query("matches")
        .withIndex("by_status", (q) => q.eq("status", "running"))
        .filter((q) =>
          q.eq(q.field("organizer_invite_token"), args.organizer_invite_token),
        )
        .first();
    }

    if (!foundMatch) {
      throw new Error("Invalid or expired organizer invite token.");
    }

    // Verify organizer password
    if (
      foundMatch.organizer_password &&
      foundMatch.organizer_password !== args.organizer_password
    ) {
      throw new Error("Incorrect organizer password.");
    }

    const orgs = foundMatch.organizer_ids || [];
    if (!orgs.includes(user._id)) {
      orgs.push(user._id);
      await ctx.db.patch(foundMatch._id, { organizer_ids: orgs });
    }

    return foundMatch._id;
  },
});

// For user profiles: get all tournaments/matches they are hosting or organizing
export const getHostedTournaments = query({
  args: { public_id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();
    if (!user) return [];

    const hostedMatches = await ctx.db
      .query("matches")
      .withIndex("by_host", (q) => q.eq("host_id", user._id))
      .collect();

    const allTournaments = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("is_tournament"), true))
      .collect();

    const organizedMatches = allTournaments.filter(
      (m) => m.organizer_ids?.includes(user._id) && m.host_id !== user._id,
    );

    const combined = [...hostedMatches, ...organizedMatches];

    const enriched = await Promise.all(
      combined.map(async (m) => {
        const players = await ctx.db
          .query("matchPlayers")
          .withIndex("by_match", (q) => q.eq("match_id", m._id))
          .collect();
        return {
          ...m,
          playerCount: players.length,
          isHost: m.host_id === user._id,
          isOrganizer: m.organizer_ids?.includes(user._id) || false,
        };
      }),
    );

    return enriched.sort((a, b) => {
      const timeA = a.scheduled_for || a.created_at;
      const timeB = b.scheduled_for || b.created_at;
      return timeB - timeA;
    });
  },
});
