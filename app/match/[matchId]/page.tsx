"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Swords,
  Clock,
  Users,
  Play,
  Loader2,
  Trophy,
  ArrowRight,
  ShieldAlert,
  Copy,
  Check,
  LogOut,
  Search,
  Lock,
} from "lucide-react";
import ArenaIde from "@/components/ArenaIde";
import { toast } from "sonner";
import { useSession } from "@/lib/auth";
import { BackButton } from "@/components/custom-ui/BackButton";

export default function ArenaMatchRoom() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const questionParam = searchParams.get("q");

  const { data: sessionData, isPending } = useSession();
  const [showStandings, setShowStandings] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    questionParam ? parseInt(questionParam, 10) : 0,
  );

  const publicId = sessionData?.user?.id || null;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isPending && !sessionData?.user) {
      router.push("/login");
    }
  }, [isPending, sessionData, router]);

  const details = useQuery(api.matches.getMatchDetails, {
    match_id: matchId as any,
  });
  const questions = useQuery(api.matches.getMatchQuestions, {
    match_id: matchId as any,
  });
  const submissions = useQuery(api.matches.getMatchSubmissions, {
    match_id: matchId as any,
    public_id: publicId || "",
  });
  const joinMatch = useMutation(api.matches.joinMatch);
  const leaveMatch = useMutation(api.matches.leaveMatch);
  const startMatch = useMutation(api.matches.startMatch);
  const joinByCode = useMutation(api.matches.joinMatchByInviteCode);
  const checkWinStreak = useMutation(
    api.achievements?.checkWinStreak || (() => false),
  );
  const addBotPlayer = useMutation(api.matches?.addBotPlayer || (() => {}));
  const updateBotScore = useMutation(api.matches?.updateBotScore || (() => {}));
  const finishMatch = useMutation(api.matches?.finishMatch || (() => {}));
  const saveTopicPreferences = useMutation(api.knockout?.saveTopicPreferences || (() => {}));
  // @ts-ignore
  const checkAndFinishBracket = useMutation(api.knockout?.checkAndFinishBracket || (() => {}));

  // Knockout-specific queries
  const isKnockout = details?.match?.mode === "Knockout";
  // @ts-ignore
  const knockoutQuestion = useQuery(
    api.knockout?.getKnockoutQuestion,
    isKnockout && publicId
      ? { match_id: matchId as any, public_id: publicId }
      : "skip",
  );
  // @ts-ignore
  const myBracket = useQuery(
    api.knockout?.getMyCurrentBracket,
    isKnockout && publicId
      ? { match_id: matchId as any, public_id: publicId }
      : "skip",
  );

  const [hasJoined, setHasJoined] = useState(false);
  const [hasAddedBot, setHasAddedBot] = useState(false);
  const [hasCheckedStreak, setHasCheckedStreak] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [topicPrefs, setTopicPrefs] = useState("");
  const [hasSavedPrefs, setHasSavedPrefs] = useState(false);

  // Exit lobby dialog
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Password dialog for private arenas
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [joiningWithPassword, setJoiningWithPassword] = useState(false);

  // Arena deleted dialog
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);

  // Redirect to home when match is running and no ?q= param — fixed: use useEffect instead of render-time
  const [shouldRedirectToHome, setShouldRedirectToHome] = useState(false);
  useEffect(() => {
    if (shouldRedirectToHome) {
      router.replace(`/match/${matchId}/home`);
    }
  }, [shouldRedirectToHome, router, matchId]);

  // Detect arena deletion/cancellation
  useEffect(() => {
    if (details === null || (details && details.match?.status === "cancelled") || (details && details.match?.is_active === false)) {
      setShowDeletedDialog(true);
      const timeout = setTimeout(() => {
        router.push("/arena");
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [details, router]);

  // Determine if current user is the host
  const isHost = details?.match
    ? details.players.some(
        (p: any) => p.user_id === details.match.host_id && publicId && p.username !== "Unknown" && details.match.host_id === p.user_id
      ) && publicId
      ? (() => {
          // Compare: find the player record whose user_id matches host_id,
          // then check if that player's public_id matches our publicId
          const hostPlayer = details.players.find((p: any) => p.user_id === details.match.host_id);
          if (!hostPlayer) return false;
          // We need to check via the user lookup — since we don't have public_id in players,
          // we check by looking up ourselves in the players list
          const myPlayer = details.players.find((p: any) => {
            // Match by checking if any player's public_id-equivalent is our publicId
            // Since getMatchDetails doesn't expose public_id, we use the user's internal id
            return false; // Will use a different approach
          });
          return false;
        })()
      : false
    : false;

  // Better host detection: check if the user in the match that has host_id matches our session
  const [isActuallyHost, setIsActuallyHost] = useState(false);
  const [isPlayerInMatch, setIsPlayerInMatch] = useState(false);

  useEffect(() => {
    if (!details || !publicId) {
      setIsActuallyHost(false);
      setIsPlayerInMatch(false);
      return;
    }
    // We need to check by querying the user table — but we don't have direct access.
    // Instead, use the ensureUser or similar approach.
    // For now, check if ANY player in the list has our publicId by comparing user_id
    // Since getMatchDetails enriches players, we can't directly compare.
    // BUT: the joinMatch mutation uses public_id to find user._id,
    // so we need a backend query. Let's use a simpler approach:
    // the getPlayerState query returns our record if we're in the match.
  }, [details, publicId]);

  // Use getPlayerState to determine if we're in the match and if we're host
  // @ts-ignore
  const playerState = useQuery(
    api.matches.getPlayerState,
    publicId ? { match_id: matchId as any, public_id: publicId } : "skip",
  );

  useEffect(() => {
    if (!details || !playerState) {
      setIsPlayerInMatch(false);
      setIsActuallyHost(false);
      return;
    }
    setIsPlayerInMatch(true);
    // Check if our user_id matches the host_id
    setIsActuallyHost(playerState.user_id === details.match.host_id);
  }, [details, playerState]);

  // Tournament Auto-Start Logic: start match if it's tournament and time is up
  useEffect(() => {
    if (
      details?.match.is_tournament &&
      details.match.status === "waiting" &&
      details.match.scheduled_for &&
      Date.now() >= details.match.scheduled_for &&
      isPlayerInMatch
    ) {
      // Any in-match player can trigger the auto start once time is reached
      startMatch({ match_id: matchId as any }).catch((e) => {
        // Only log, might be triggered by multiple clients concurrently
        console.log("Tournament start trigger attempt:", e);
      });
    }

    // Force redirect out if a user accesses tournament lobby outside the 2m window
    if (details?.match.is_tournament && details.match.status === "waiting" && details.match.scheduled_for) {
      const now = Date.now();
      if (now < details.match.scheduled_for || now > details.match.scheduled_for + 120000) {
        toast.error("Tournament lobby is currently closed.");
        router.replace("/arena");
      }
    }
  }, [details, matchId, isPlayerInMatch, startMatch, router]);

  // Auto-join if waiting and not yet joined
  useEffect(() => {
    if (
      publicId &&
      details &&
      !hasJoined &&
      details.match.status === "waiting" &&
      !details.match.password // Only auto-join if no password
    ) {
      // don't auto join tournaments (should be handled via register earlier)
      if (details.match.is_tournament) {
        // Assuming they registered, we don't automatically call joinMatch because they are already added
        // Wait, joinMatch handles non-tournaments. For tournaments, we shouldn't call joinMatch,
        // because registerForTournament already adds them to matchPlayers!
        setHasJoined(true);
        return;
      }
      joinMatch({ public_id: publicId, match_id: matchId as any })
        .then(() => setHasJoined(true))
        .catch((err: any) => {
          // If match requires password, show password dialog
          if (err.message?.includes("password") || err.message?.includes("Incorrect")) {
            setShowPasswordDialog(true);
          } else {
            console.error(err);
          }
        });
    }
    // If match has a password and we're not a player, show password dialog
    if (
      publicId &&
      details &&
      details.match.password &&
      !hasJoined &&
      !playerState &&
      details.match.status === "waiting"
    ) {
      setShowPasswordDialog(true);
    }
  }, [publicId, details, hasJoined, joinMatch, matchId, playerState]);

  // Check achievements on match end
  useEffect(() => {
    if (details?.match.status === "finished" && publicId && !hasCheckedStreak) {
      setHasCheckedStreak(true);
      checkWinStreak({ public_id: publicId })
        .then((unlocked) => {
          if (unlocked)
            toast.success("Achievement Unlocked! 🔥 Win Streak", {
              duration: 5000,
            });
        })
        .catch(console.error);
    }
  }, [details?.match.status, publicId, hasCheckedStreak, checkWinStreak]);

  // Manage Practice Bot
  useEffect(() => {
    if (
      details?.match.status === "waiting" &&
      details?.match.mode === "Practice" &&
      isActuallyHost &&
      !hasAddedBot
    ) {
      addBotPlayer({ match_id: matchId as any }).then(() =>
        setHasAddedBot(true),
      );
    }

    if (
      details?.match.status === "running" &&
      details?.match.mode === "Practice" &&
      isActuallyHost
    ) {
      const interval = setInterval(() => {
        if (Math.random() > 0.5) {
          updateBotScore({ match_id: matchId as any });
        }
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [
    details?.match.status,
    details?.match.mode,
    isActuallyHost,
    hasAddedBot,
    matchId,
    addBotPlayer,
    updateBotScore,
  ]);

  // Copy invite code
  const copyInviteCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopiedCode(false), 2000);
  }, []);

  // Handle exit lobby
  const handleExitLobby = async () => {
    if (publicId) {
      try {
        await leaveMatch({ public_id: publicId, match_id: matchId as any });
        toast.success("Left the arena");
      } catch (e) {
        console.error(e);
      }
    }
    setShowExitDialog(false);
    router.push("/arena");
  };

  // Handle password join
  const handlePasswordJoin = async () => {
    if (!publicId || !passwordInput.trim()) return;
    setJoiningWithPassword(true);
    try {
      await joinByCode({
        public_id: publicId,
        invite_code: details?.match?.invite_code || "",
        password: passwordInput,
      });
      setShowPasswordDialog(false);
      setPasswordInput("");
      setHasJoined(true);
      toast.success("Joined arena!");
    } catch (e: any) {
      toast.error(e.message || "Incorrect password");
    } finally {
      setJoiningWithPassword(false);
    }
  };

  // Arena Deleted Dialog
  if (showDeletedDialog) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="bg-neutral-900 border border-red-500/30 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
            <ShieldAlert size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Arena Removed</h2>
          <p className="text-neutral-400 mb-6">
            This arena has been closed by the host. You will be redirected to the arena lobby.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
            <Loader2 className="animate-spin" size={16} />
            Redirecting...
          </div>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-pink-500" size={48} />
      </div>
    );
  }

  const { match, players } = details;

  const handleStartMatch = async () => {
    if (players.length < 2) {
      toast.error("Need at least 2 players to start the arena!");
      return;
    }
    try {
      await startMatch({ match_id: matchId as any });
    } catch (e) {
      console.error(e);
      toast.error("Failed to start match");
    }
  };

  const handleSavePreferences = async () => {
    if (!publicId || !topicPrefs.trim()) return;
    try {
      await saveTopicPreferences({
        match_id: matchId as any,
        public_id: publicId,
        preferences: topicPrefs,
      });
      setHasSavedPrefs(true);
      toast.success("Preferences locked in!");
    } catch(e) {
      toast.error("Failed to save preferences");
    }
  };

  const handleIdeComplete = () => {
    router.push(`/match/${matchId}/home`);
  };

  // Password Dialog for private arenas
  if (showPasswordDialog && !isPlayerInMatch) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/20 mb-6">
            <Lock size={32} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white text-center mb-2">Private Arena</h2>
          <p className="text-neutral-400 text-center text-sm mb-6">
            This arena requires a password to join.
          </p>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePasswordJoin()}
            placeholder="Enter arena password"
            className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-white text-center font-mono outline-none focus:border-pink-500 transition mb-4"
          />
          <button
            onClick={handlePasswordJoin}
            disabled={joiningWithPassword || !passwordInput.trim()}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {joiningWithPassword ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Joining...
              </>
            ) : (
              "Join Arena"
            )}
          </button>
          <button
            onClick={() => router.push("/arena")}
            className="w-full mt-3 py-3 text-neutral-400 hover:text-white transition text-sm font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Waiting State (Lobby)
  if (match.status === "waiting") {
    const canStart = isActuallyHost && players.length >= 2;
    const needsMorePlayers = players.length < 2 && !match.is_tournament;

    // Calculate tournament time until start
    let tournamentTimeLeft = 0;
    if (match.is_tournament && match.scheduled_for) {
      tournamentTimeLeft = Math.max(0, Math.floor((match.scheduled_for - Date.now()) / 1000));
    }

    return (
      <div className="min-h-screen bg-black text-white p-6 md:p-12 relative flex items-center justify-center">
        <div className="absolute inset-0 bg-neutral-950">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(236,72,153,0.1),transparent_50%)]" />
        </div>

        <div className="max-w-4xl w-full relative z-10">
          {/* Back / Exit Button */}
          <button
            onClick={() => setShowExitDialog(true)}
            className="mb-4 flex items-center gap-2 text-neutral-400 hover:text-white transition text-sm font-bold"
          >
            <LogOut size={16} /> Exit Lobby
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Match Settings Info */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 backdrop-blur-xl">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center border border-pink-500/20 mb-6 text-pink-500">
                <Swords size={32} />
              </div>
              <h1 className="text-3xl font-black mb-2">Arena Lobby</h1>
              <p className="text-neutral-400 mb-6">
                {match.arena_name || `${match.difficulty} Arena`}
              </p>

              {/* Invite Code */}
              {match.invite_code && (
                <div className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 mb-6">
                  <div className="text-xs text-neutral-500 font-bold uppercase tracking-wider mb-2">
                    Invite Code — Share with friends
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-2xl text-white tracking-[0.3em]">
                      {match.invite_code}
                    </span>
                    <button
                      onClick={() => copyInviteCode(match.invite_code!)}
                      className="flex items-center gap-2 px-4 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 rounded-lg transition text-sm font-bold border border-pink-500/20"
                    >
                      {copiedCode ? (
                        <><Check size={14} /> Copied!</>
                      ) : (
                        <><Copy size={14} /> Copy</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-neutral-800">
                  <span className="text-neutral-400 flex items-center gap-2">
                    <Trophy size={18} /> Difficulty
                  </span>
                  <span className="font-bold text-white">
                    {match.difficulty}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-800">
                  <span className="text-neutral-400 flex items-center gap-2">
                    <Clock size={18} /> Time Limit
                  </span>
                  <span className="font-bold text-white">
                    {match.time_limit / 60} Minutes
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-neutral-800">
                  <span className="text-neutral-400 flex items-center gap-2">
                    <ShieldAlert size={18} /> Mode
                  </span>
                  <span className="font-bold text-pink-400 uppercase tracking-wider text-sm">
                    {match.mode}
                  </span>
                </div>
              </div>

              {match.mode === "Knockout" && isPlayerInMatch && (
                <div className="mt-8 p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl">
                  <h3 className="text-sm font-bold text-pink-400 mb-2">Knockout Topic Preferences</h3>
                  <p className="text-xs text-neutral-400 mb-3 block">
                    Type topics you excel at (e.g. "Arrays, Maps, Strings"). The system will try to combine yours and your opponent's for customized 1v1 questions.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={topicPrefs}
                      onChange={(e) => setTopicPrefs(e.target.value)}
                      disabled={hasSavedPrefs}
                      placeholder="e.g. Trees, Sorting"
                      className="flex-1 bg-black/50 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white focus:border-pink-500 outline-none disabled:opacity-50"
                    />
                    <button
                      onClick={handleSavePreferences}
                      disabled={hasSavedPrefs || topicPrefs.length < 2}
                      className="bg-pink-500 hover:bg-pink-400 text-white font-bold text-sm px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {hasSavedPrefs ? "Saved" : "Save"}
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-8">
                {match.is_tournament ? (
                  <div className="w-full py-6 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-2xl flex flex-col items-center justify-center gap-2">
                    <span className="text-blue-200 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                      <Clock size={16} className="animate-pulse" /> TOURNAMENT STARTS IN
                    </span>
                    <span className="text-4xl font-black text-white font-mono drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]">
                      {Math.floor(tournamentTimeLeft / 60)}:{(tournamentTimeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                ) : isActuallyHost ? (
                  <div className="space-y-3">
                    <button
                      onClick={handleStartMatch}
                      disabled={!canStart}
                      className={`w-full py-4 font-black text-lg rounded-xl shadow-[0_0_30px_rgba(236,72,153,0.4)] transition-all flex items-center justify-center gap-2 ${
                        canStart
                          ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white"
                          : "bg-neutral-800 text-neutral-500 cursor-not-allowed shadow-none"
                      }`}
                    >
                      <Play fill="currentColor" size={20} /> BEGIN ARENA
                    </button>
                    {needsMorePlayers && (
                      <p className="text-xs text-neutral-500 text-center">
                        Need at least 2 players to start
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="w-full py-4 bg-neutral-800 text-neutral-400 font-bold rounded-xl flex items-center justify-center gap-3">
                    <Loader2 className="animate-spin" size={20} /> Waiting for
                    Host to start...
                  </div>
                )}
              </div>
            </div>

            {/* Players List */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 backdrop-blur-xl flex flex-col">
              <h2 className="text-xl font-bold flex items-center gap-3 mb-6">
                <Users className="text-blue-400" />
                Contenders ({players.length}/{match.max_players || 20})
              </h2>

              {/* Searching indicator when only 1 player */}
              {needsMorePlayers && (
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-4 flex items-center gap-3 animate-pulse">
                  <Search size={18} className="text-blue-400" />
                  <div>
                    <p className="text-sm font-bold text-blue-300">Searching for opponents...</p>
                    <p className="text-xs text-neutral-500">
                      Share the invite code above to invite players
                    </p>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                {players.map((p: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-neutral-800"
                  >
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-neutral-400">
                      {p.username !== "Unknown"
                        ? p.username[0].toUpperCase()
                        : "?"}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        {p.username}
                        {p.user_id === match.host_id && (
                          <span className="text-[10px] bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded uppercase tracking-wider">
                            Host
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Rating: {p.rating}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Exit Lobby Dialog */}
        {showExitDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-sm w-full p-8 shadow-2xl text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6">
                <LogOut size={28} className="text-amber-400" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Exit Lobby?</h3>
              <p className="text-neutral-400 text-sm mb-6">
                Are you sure you want to leave this arena? You will be removed from the player list.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowExitDialog(false)}
                  className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition border border-neutral-700"
                >
                  Stay
                </button>
                <button
                  onClick={handleExitLobby}
                  className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold rounded-xl transition border border-red-500/30"
                >
                  Leave
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Running State
  if (match.status === "running") {
    // Knockout mode: handle ?q=knockout param
    if (isKnockout && questionParam === "knockout") {
      if (!knockoutQuestion) {
        return (
          <div className="h-screen w-full bg-black flex items-center justify-center text-white">
            <Loader2 className="animate-spin text-pink-500 mr-3" size={24} />{" "}
            Loading your knockout challenge...
          </div>
        );
      }

      const handleKnockoutComplete = async () => {
        // Auto-check bracket after submission
        try {
          // @ts-ignore
          await checkAndFinishBracket({
            match_id: matchId as any,
            public_id: publicId!,
          });
        } catch (e) {
          console.error("Auto-finish bracket error:", e);
        }
        router.push(`/match/${matchId}/home`);
      };

      return (
        <div className="h-screen flex bg-black text-white">
          {/* Knockout Opponent Banner */}
          {myBracket && (
            <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-500/10 via-pink-500/10 to-purple-500/10 border-b border-red-500/20 px-4 py-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <Swords size={16} className="text-pink-500" />
                <span className="font-bold text-neutral-300">Round {myBracket.round}</span>
                <span className="text-neutral-500">vs</span>
                <span className="font-bold text-red-400">{myBracket.opponent_name}</span>
              </div>
              {myBracket.opponentProgress && (
                <span className={`font-bold text-xs px-2 py-0.5 rounded ${
                  myBracket.opponentProgress.result === "Accepted"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  Opponent: {myBracket.opponentProgress.result === "Accepted"
                    ? "✅ Solved"
                    : `${myBracket.opponentProgress.testcases_passed} TC passed`}
                </span>
              )}
            </div>
          )}
          {/* IDE Main Area */}
          <div className="flex-1 relative min-w-0 flex flex-col pt-10">
            <ArenaIde
              question={knockoutQuestion}
              allowedLanguages={match.allowed_languages}
              storageKey={`knockout_${matchId}_r${myBracket?.round}`}
              matchId={matchId}
              publicId={publicId as string}
              onBack={() => {
                router.push(`/match/${matchId}/home`);
              }}
              onComplete={handleKnockoutComplete}
            />
          </div>
        </div>
      );
    }

    // If no ?q= param, redirect to Arena Home page (via useEffect, NOT during render)
    if (questionParam === null) {
      if (!shouldRedirectToHome) {
        // Trigger inside effect on next render
        setTimeout(() => setShouldRedirectToHome(true), 0);
      }
      return (
        <div className="h-screen w-full bg-black flex items-center justify-center text-white">
          <Loader2 className="animate-spin text-pink-500 mr-3" size={24} />{" "}
          Redirecting to Arena Home...
        </div>
      );
    }

    if (!questions || questions.length === 0) {
      return (
        <div className="h-screen w-full bg-black flex items-center justify-center text-white">
          <Loader2 className="animate-spin text-pink-500 mr-3" size={24} />{" "}
          Loading Arena Engine...
        </div>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
      <div className="h-screen flex bg-black text-white">
        {" "}
        {/* Live Leaderboard Sidebar */}
        <div
          className={`bg-neutral-950 flex flex-col z-30 shadow-2xl overflow-hidden shrink-0
  ${showStandings ? "w-full md:w-64 border-r border-neutral-800" : "w-0 border-none"}`}
        >
          {" "}
          <div className="p-4 border-b border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-pink-500 font-black">
              <Swords size={20} />
              LIVE STANDINGS
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {[...players]
              .sort((a: any, b: any) => {
                if (a.left_match && !b.left_match) return 1;
                if (!a.left_match && b.left_match) return -1;
                return b.score - a.score;
              })
              .map((p: any, i: number) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-center justify-between ${i === 0 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-neutral-900/50 border-neutral-800"}`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`font-black w-6 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-neutral-300" : i === 2 ? "text-amber-600" : "text-neutral-600"}`}
                    >
                      #{i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white truncate max-w-[80px] flex items-center gap-2">
                        {p.username}
                        {p.left_match && (
                          <span className="text-[9px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Left
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {p.solved_count}/{match.number_of_questions} Solved
                      </div>
                    </div>
                  </div>
                  <div className={`text-right text-xs font-mono font-bold ${p.left_match ? 'text-neutral-600 line-through' : 'text-green-400'}`}>
                    {p.score} pt
                  </div>
                </div>
              ))}
          </div>
        </div>
        {/* IDE Main Area */}
        <div className="flex-1 relative min-w-0 flex flex-col">
          <ArenaIde
            question={currentQuestion}
            allowedLanguages={match.allowed_languages}
            storageKey={`arena_${matchId}_q${currentQuestionIndex}`}
            matchId={matchId}
            publicId={publicId || undefined}
            toggleStandings={() => setShowStandings((prev) => !prev)}
            onBack={() => {
              router.push(`/match/${matchId}/home`);
            }}
            onComplete={handleIdeComplete}
          />
        </div>
      </div>
    );
  }

  // Match Finished State
  const sortedPlayers = [...players].sort(
    (a: any, b: any) => {
      if (a.left_match && !b.left_match) return 1;
      if (!a.left_match && b.left_match) return -1;
      return b.score - a.score;
    }
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 relative flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-neutral-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.15),transparent_50%)]" />
      </div>

      <div className="relative z-10 max-w-3xl w-full text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 text-yellow-900 mb-6 shadow-[0_0_50px_rgba(234,179,8,0.5)]">
          <Trophy size={48} />
        </div>
        <h1 className="text-5xl font-black mb-4">Match Concluded</h1>
        <p className="text-xl text-neutral-400">
          The dust has settled. Here are the final standings.
        </p>
      </div>

      <div className="relative z-10 max-w-3xl w-full bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
        <div className="flex flex-col gap-4">
          {sortedPlayers.map((p: any, i: number) => {
            const isMe = playerState?.user_id === p.user_id;
            return (
              <div
                key={i}
                className={`flex items-center justify-between p-4 rounded-2xl border ${i === 0 ? "bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/50" : isMe ? "bg-white/5 border-neutral-600" : "bg-black/50 border-neutral-800"}`}
              >
                <div className="flex items-center gap-6">
                  <div
                    className={`text-3xl font-black w-8 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-neutral-300" : i === 2 ? "text-amber-600" : "text-neutral-600"}`}
                  >
                    #{i + 1}
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white flex items-center gap-3">
                      {p.username}
                      {isMe && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase tracking-wider">
                          You
                        </span>
                      )}
                      {p.left_match && (
                        <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded uppercase tracking-wider border border-red-500/30">
                          Left
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-neutral-500 flex items-center gap-4 mt-1">
                      <span>{p.solved_count} Solved</span>
                      <span>
                        {Math.floor(p.total_time / 60)}m {p.total_time % 60}s
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-2xl font-black ${p.left_match ? 'text-neutral-600 line-through' : 'text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500'}`}>
                    {p.score} pt
                  </div>
                  <div className="text-xs font-bold text-neutral-400 mt-1">
                    Rating: {p.rating}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => router.push("/arena")}
          className="mt-8 w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-neutral-700 hover:border-neutral-500 flex items-center justify-center gap-2"
        >
          Return to Lobby <ArrowRight size={18} />
        </button>

        <div className="mt-8 pt-8 border-t border-neutral-800 text-left">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Clock size={24} className="text-pink-500" /> Your Submission
            Timeline
          </h2>
          {submissions && submissions.length > 0 ? (
            <div className="space-y-3">
              {submissions.map((sub: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-neutral-800 text-sm"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider ${sub.result === "Accepted" ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"}`}
                    >
                      {sub.result}
                    </span>
                    <span className="text-neutral-400 font-medium">
                      {new Date(sub.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex gap-6 text-neutral-500 font-mono text-xs font-bold">
                    <span className="flex items-center gap-1">
                      <Clock size={14} /> {sub.runtime}ms
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldAlert size={14} /> {sub.memory}MB
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-neutral-500 p-6 bg-black/40 rounded-xl border border-neutral-800 italic text-center">
              No submissions recorded during this match.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
