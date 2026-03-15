import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveTopicPreferences = mutation({
  args: {
    match_id: v.id("matches"),
    public_id: v.string(),
    preferences: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();
    if (!user) throw new Error("User not found");

    const playerRecord = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .filter((q) => q.eq(q.field("user_id"), user._id))
      .first();

    if (!playerRecord) throw new Error("Player not in match");

    await ctx.db.patch(playerRecord._id, {
      topic_preferences: args.preferences.slice(0, 100), // Limit length
    });

    return true;
  },
});

export const getBracketState = query({
  args: { match_id: v.id("matches") },
  handler: async (ctx, args) => {
    const brackets = await ctx.db
      .query("matchBrackets")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    // Enrich with usernames
    const enriched = await Promise.all(
      brackets.map(async (b) => {
        const p1 = b.player1_id ? await ctx.db.get(b.player1_id) : null;
        const p2 = b.player2_id ? await ctx.db.get(b.player2_id) : null;
        const winner = b.winner_id ? await ctx.db.get(b.winner_id) : null;
        return {
          ...b,
          player1_name: p1?.username,
          player2_name: p2?.username,
          winner_name: winner?.username,
        };
      })
    );
    return enriched;
  },
});

export const finishKnockoutRound = mutation({
  args: { bracket_id: v.id("matchBrackets") },
  handler: async (ctx, args) => {
    const bracket = await ctx.db.get(args.bracket_id);
    if (!bracket || bracket.status === "completed") return false;

    const match = await ctx.db.get(bracket.match_id);
    if (!match) return false;

    // Determine Winner based on submissions for this specific question
    let winnerId = bracket.player1_id || bracket.player2_id; // Default

    if (bracket.player1_id && bracket.player2_id && bracket.question_id) {
      // Check for left players first
      const p1Record = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("match_id", bracket.match_id)).filter(q => q.eq(q.field("user_id"), bracket.player1_id!)).first();
      const p2Record = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("match_id", bracket.match_id)).filter(q => q.eq(q.field("user_id"), bracket.player2_id!)).first();

      const p1Left = p1Record?.left_match === true;
      const p2Left = p2Record?.left_match === true;

      // Ensure loss count is updated for whoever left
      if (p1Left) {
        const u = await ctx.db.get(bracket.player1_id);
        if (u) await ctx.db.patch(u._id, { losses: (u.losses || 0) + 1 });
      }
      if (p2Left) {
        const u = await ctx.db.get(bracket.player2_id);
        if (u) await ctx.db.patch(u._id, { losses: (u.losses || 0) + 1 });
      }

      if (p1Left && !p2Left) {
        winnerId = bracket.player2_id;
      } else if (!p1Left && p2Left) {
        winnerId = bracket.player1_id;
      } else if (p1Left && p2Left) {
        // Both left, just pick one to advance or end it
        winnerId = Math.random() > 0.5 ? bracket.player1_id : bracket.player2_id;
      } else {
        // Normal evaluation (neither left)
        const sub1 = await ctx.db
          .query("matchSubmissions")
          .withIndex("by_match_user", q => q.eq("match_id", bracket.match_id).eq("user_id", bracket.player1_id!))
          .filter(q => q.eq(q.field("question_id"), bracket.question_id!))
          .first();

        const sub2 = await ctx.db
          .query("matchSubmissions")
          .withIndex("by_match_user", q => q.eq("match_id", bracket.match_id).eq("user_id", bracket.player2_id!))
          .filter(q => q.eq(q.field("question_id"), bracket.question_id!))
          .first();

        const p1Correct = sub1?.result === "Accepted";
        const p2Correct = sub2?.result === "Accepted";

        if (p1Correct && !p2Correct) {
          winnerId = bracket.player1_id;
        } else if (!p1Correct && p2Correct) {
          winnerId = bracket.player2_id;
        } else if (p1Correct && p2Correct) {
          winnerId = (sub1!.runtime < sub2!.runtime) ? bracket.player1_id : bracket.player2_id; 
        } else {
          const p1Passed = sub1?.testcases_passed || 0;
          const p2Passed = sub2?.testcases_passed || 0;
          if (p1Passed > p2Passed) {
            winnerId = bracket.player1_id;
          } else if (p2Passed > p1Passed) {
            winnerId = bracket.player2_id;
          } else {
            winnerId = Math.random() > 0.5 ? bracket.player1_id : bracket.player2_id;
          }
        }
      }
    } else if (bracket.player1_id) {
        winnerId = bracket.player1_id; // Bye
    } else if (bracket.player2_id) {
        winnerId = bracket.player2_id;
    }

    // Mark completed
    await ctx.db.patch(bracket._id, {
      winner_id: winnerId,
      status: "completed"
    });

    // Advance to next bracket if exists
    if (winnerId && bracket.next_match_index !== undefined) {
      const nextRounds = await ctx.db
        .query("matchBrackets")
        .withIndex("by_round", q => q.eq("match_id", bracket.match_id).eq("round", bracket.round + 1))
        .collect();
      
      const targetBracket = nextRounds.find(b => b.match_index === bracket.next_match_index);
      if (targetBracket) {
        // Figure out if we are player1 or player2 in the next bracket
        if (!targetBracket.player1_id) {
          await ctx.db.patch(targetBracket._id, { player1_id: winnerId });
        } else if (!targetBracket.player2_id && targetBracket.player1_id !== winnerId) {
          await ctx.db.patch(targetBracket._id, { player2_id: winnerId });
          
          // Now that both players are present, we can generate a question using their preferences
          const p1Record = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("match_id", bracket.match_id)).filter(q => q.eq(q.field("user_id"), targetBracket.player1_id!)).first();
          const p2Record = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("match_id", bracket.match_id)).filter(q => q.eq(q.field("user_id"), winnerId!)).first();

          const prefs = [p1Record?.topic_preferences, p2Record?.topic_preferences].filter(Boolean).join(" ").toLowerCase();
          
          const allQuestions = await ctx.db
            .query("questions")
            .withIndex("by_difficulty", (q) => q.eq("difficulty", match.difficulty))
            .filter((q) => q.eq(q.field("locked"), false))
            .collect();
            
          let finalQId = allQuestions.sort(() => 0.5 - Math.random())[0]?._id;
          if (prefs) {
            const preferedQuestion = allQuestions.find(q => prefs.includes(q.topic.toLowerCase()));
            if (preferedQuestion) finalQId = preferedQuestion._id;
          }

          if (finalQId) {
             await ctx.db.patch(targetBracket._id, { question_id: finalQId, status: "running" });
          }
        }
      }
    } else {
       // If no next_match_index, this was the finals!
       // End the overall match
       if (bracket.status !== "completed") {
           // update total score for the winner to ensure they rank #1 in the final match standings
           const winnerPlayer = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("match_id", bracket.match_id)).filter(q => q.eq(q.field("user_id"), winnerId!)).first();
           if (winnerPlayer) {
              await ctx.db.patch(winnerPlayer._id, { score: winnerPlayer.score + 10000 }); // Massive boost to dominate standings
           }
           await ctx.db.patch(bracket.match_id, {
               status: "finished",
               ended_at: Date.now(),
               is_active: false
           });
       }
    }

    return winnerId;
  }
});

// Find the current active bracket node for a specific user
export const getMyCurrentBracket = query({
  args: {
    match_id: v.id("matches"),
    public_id: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();
    if (!user) return null;

    const brackets = await ctx.db
      .query("matchBrackets")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    // Find the active bracket where the user is a player and status is "running"
    let activeBracket = brackets.find(
      (b) =>
        b.status === "running" &&
        (b.player1_id === user._id || b.player2_id === user._id)
    );

    // If no running bracket, check for "waiting" brackets where both players are assigned
    if (!activeBracket) {
      activeBracket = brackets.find(
        (b) =>
          b.status === "waiting" &&
          b.player1_id &&
          b.player2_id &&
          (b.player1_id === user._id || b.player2_id === user._id)
      );
    }

    if (!activeBracket) {
      // Check if eliminated
      const eliminatedBracket = brackets.find(
        (b) =>
          b.status === "completed" &&
          (b.player1_id === user._id || b.player2_id === user._id) &&
          b.winner_id !== user._id
      );
      if (eliminatedBracket) {
        const opponent_id =
          eliminatedBracket.player1_id === user._id
            ? eliminatedBracket.player2_id
            : eliminatedBracket.player1_id;
        const opponent = opponent_id ? await ctx.db.get(opponent_id) : null;
        const winner = eliminatedBracket.winner_id
          ? await ctx.db.get(eliminatedBracket.winner_id)
          : null;
        return {
          ...eliminatedBracket,
          eliminated: true,
          champion: false,
          my_id: user._id,
          opponent_name: opponent?.username || "Unknown",
          opponent_rating: opponent?.rating || 0,
          opponent_profile_picture: opponent?.profile_picture,
          winner_name: winner?.username || "Unknown",
          opponentProgress: null,
          myProgress: null,
        };
      }

      // Check if champion
      const match = await ctx.db.get(args.match_id);
      if (match?.status === "finished") {
        const finalBracket = brackets
          .filter((b) => b.status === "completed" && b.winner_id === user._id)
          .sort((a, b) => b.round - a.round)[0];
        if (finalBracket) {
          return {
            ...finalBracket,
            eliminated: false,
            champion: true,
            my_id: user._id,
            opponent_name: "—",
            opponent_rating: 0,
            opponent_profile_picture: undefined,
            winner_name: user.username,
            opponentProgress: null,
            myProgress: null,
          };
        }
      }

      return null;
    }

    // Enrich with opponent info
    const opponent_id =
      activeBracket.player1_id === user._id
        ? activeBracket.player2_id
        : activeBracket.player1_id;
    const opponent = opponent_id ? await ctx.db.get(opponent_id) : null;

    // Get opponent's submission for this bracket's question
    let opponentProgress = null;
    if (opponent_id && activeBracket.question_id) {
      const opponentSub = await ctx.db
        .query("matchSubmissions")
        .withIndex("by_match_user", (q) =>
          q.eq("match_id", args.match_id).eq("user_id", opponent_id!)
        )
        .filter((q) =>
          q.eq(q.field("question_id"), activeBracket!.question_id!)
        )
        .first();
      if (opponentSub) {
        opponentProgress = {
          submitted: true,
          result: opponentSub.result,
          testcases_passed: opponentSub.testcases_passed || 0,
        };
      }
    }

    // Get my submission status
    let myProgress = null;
    if (activeBracket.question_id) {
      const mySub = await ctx.db
        .query("matchSubmissions")
        .withIndex("by_match_user", (q) =>
          q.eq("match_id", args.match_id).eq("user_id", user._id)
        )
        .filter((q) =>
          q.eq(q.field("question_id"), activeBracket!.question_id!)
        )
        .first();
      if (mySub) {
        myProgress = {
          submitted: true,
          result: mySub.result,
          testcases_passed: mySub.testcases_passed || 0,
        };
      }
    }

    // Total rounds for progress display
    const maxRound = brackets.length > 0
      ? Math.max(...brackets.map((b) => b.round))
      : 1;

    return {
      ...activeBracket,
      eliminated: false,
      champion: false,
      my_id: user._id,
      opponent_name: opponent?.username || "Waiting...",
      opponent_rating: opponent?.rating || 0,
      opponent_profile_picture: opponent?.profile_picture,
      opponentProgress,
      myProgress,
      totalRounds: maxRound,
    };
  },
});

// Get the full question object for the user's current knockout bracket
export const getKnockoutQuestion = query({
  args: {
    match_id: v.id("matches"),
    public_id: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();
    if (!user) return null;

    const brackets = await ctx.db
      .query("matchBrackets")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    const activeBracket = brackets.find(
      (b) =>
        b.status === "running" &&
        (b.player1_id === user._id || b.player2_id === user._id)
    );

    if (!activeBracket?.question_id) return null;

    const question = await ctx.db.get(activeBracket.question_id);
    return question;
  },
});

// Auto-check bracket completion after a submission
export const checkAndFinishBracket = mutation({
  args: {
    match_id: v.id("matches"),
    public_id: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_public_id", (q) => q.eq("public_id", args.public_id))
      .first();
    if (!user) return false;

    const brackets = await ctx.db
      .query("matchBrackets")
      .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
      .collect();

    const activeBracket = brackets.find(
      (b) =>
        b.status === "running" &&
        (b.player1_id === user._id || b.player2_id === user._id)
    );

    if (!activeBracket || !activeBracket.question_id) return false;
    if (!activeBracket.player1_id || !activeBracket.player2_id) return false;

    // Check if both players have submitted
    const sub1 = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_match_user", (q) =>
        q
          .eq("match_id", args.match_id)
          .eq("user_id", activeBracket.player1_id!)
      )
      .filter((q) =>
        q.eq(q.field("question_id"), activeBracket.question_id!)
      )
      .first();

    const sub2 = await ctx.db
      .query("matchSubmissions")
      .withIndex("by_match_user", (q) =>
        q
          .eq("match_id", args.match_id)
          .eq("user_id", activeBracket.player2_id!)
      )
      .filter((q) =>
        q.eq(q.field("question_id"), activeBracket.question_id!)
      )
      .first();

    if (!sub1 || !sub2) return false;

    // Both submitted — determine winner
    const match = await ctx.db.get(args.match_id);
    if (!match) return false;

    let winnerId = activeBracket.player1_id;
    const p1Correct = sub1.result === "Accepted";
    const p2Correct = sub2.result === "Accepted";

    if (p1Correct && !p2Correct) {
      winnerId = activeBracket.player1_id;
    } else if (!p1Correct && p2Correct) {
      winnerId = activeBracket.player2_id;
    } else if (p1Correct && p2Correct) {
      winnerId =
        sub1.timestamp < sub2.timestamp
          ? activeBracket.player1_id
          : activeBracket.player2_id;
    } else {
      const p1Passed = sub1.testcases_passed || 0;
      const p2Passed = sub2.testcases_passed || 0;
      if (p1Passed > p2Passed) {
        winnerId = activeBracket.player1_id;
      } else if (p2Passed > p1Passed) {
        winnerId = activeBracket.player2_id;
      } else {
        winnerId =
          sub1.timestamp < sub2.timestamp
            ? activeBracket.player1_id
            : activeBracket.player2_id;
      }
    }

    // Mark completed
    await ctx.db.patch(activeBracket._id, {
      winner_id: winnerId,
      status: "completed",
    });

    // Advance winner to next bracket
    if (winnerId && activeBracket.next_match_index !== undefined) {
      const nextRounds = await ctx.db
        .query("matchBrackets")
        .withIndex("by_round", (q) =>
          q
            .eq("match_id", args.match_id)
            .eq("round", activeBracket.round + 1)
        )
        .collect();

      const targetBracket = nextRounds.find(
        (b) => b.match_index === activeBracket.next_match_index
      );
      if (targetBracket) {
        if (!targetBracket.player1_id) {
          await ctx.db.patch(targetBracket._id, { player1_id: winnerId });
        } else if (
          !targetBracket.player2_id &&
          targetBracket.player1_id !== winnerId
        ) {
          await ctx.db.patch(targetBracket._id, { player2_id: winnerId });

          // Both players present — generate topic-blended question and start
          const p1Record = await ctx.db
            .query("matchPlayers")
            .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
            .filter((q) =>
              q.eq(q.field("user_id"), targetBracket.player1_id!)
            )
            .first();
          const p2Record = await ctx.db
            .query("matchPlayers")
            .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
            .filter((q) => q.eq(q.field("user_id"), winnerId!))
            .first();

          const prefs = [
            p1Record?.topic_preferences,
            p2Record?.topic_preferences,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          const allQuestions = await ctx.db
            .query("questions")
            .withIndex("by_difficulty", (q) =>
              q.eq("difficulty", match.difficulty)
            )
            .filter((q) => q.eq(q.field("locked"), false))
            .collect();

          let finalQId = allQuestions.sort(() => 0.5 - Math.random())[0]?._id;
          if (prefs) {
            const prefQ = allQuestions.find((q) =>
              prefs.includes(q.topic.toLowerCase())
            );
            if (prefQ) finalQId = prefQ._id;
          }

          if (finalQId) {
            await ctx.db.patch(targetBracket._id, {
              question_id: finalQId,
              status: "running",
            });
          }
        }
      }
    } else {
      // Finals — end the match
      const winnerPlayer = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("match_id", args.match_id))
        .filter((q) => q.eq(q.field("user_id"), winnerId!))
        .first();
      if (winnerPlayer) {
        await ctx.db.patch(winnerPlayer._id, {
          score: winnerPlayer.score + 10000,
        });
      }
      await ctx.db.patch(args.match_id, {
        status: "finished",
        ended_at: Date.now(),
        is_active: false,
      });
    }

    return winnerId;
  },
});
