"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Clock,
  Users,
  Trophy,
  Lock,
  Unlock,
  CheckCircle,
  Swords,
  Play,
  Loader2,
  MessageSquare,
  Send,
  ArrowLeft,
  Zap,
  Timer,
  ShieldAlert,
  Copy,
  Check,
  Target,
  Crown,
  XCircle,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useSession } from "@/lib/auth";
import { toast } from "sonner";

export default function ArenaHomePage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.matchId as string;
  const { data: sessionData } = useSession();
  const publicId = sessionData?.user?.id || "";

  // Queries
  const details = useQuery(api.matches.getMatchDetails, {
    match_id: matchId as any,
  });
  const questions = useQuery(api.matches.getMatchQuestions, {
    match_id: matchId as any,
  });
  // @ts-ignore
  const playerState = useQuery(
    api.matches.getPlayerState,
    publicId ? { match_id: matchId as any, public_id: publicId } : "skip",
  );
  // @ts-ignore
  const standings = useQuery(api.matches.getMatchStandings, {
    match_id: matchId as any,
  });
  // @ts-ignore
  const chatMessages = useQuery(api.matches.getArenaChat, {
    match_id: matchId as any,
  });

  // Knockout-specific queries (only when mode is Knockout)
  const isKnockout = details?.match?.mode === "Knockout";
  // @ts-ignore
  const bracketState = useQuery(
    api.knockout.getBracketState,
    isKnockout ? { match_id: matchId as any } : "skip",
  );
  // @ts-ignore
  const myBracket = useQuery(
    api.knockout.getMyCurrentBracket,
    isKnockout && publicId
      ? { match_id: matchId as any, public_id: publicId }
      : "skip",
  );

  // Mutations
  // @ts-ignore
  const sendChat = useMutation(api.matches.sendArenaChat);
  const finishMatch = useMutation(api.matches.finishMatch);

  // Local state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  // Arena deleted dialog
  const [showDeletedDialog, setShowDeletedDialog] = useState(false);

  // Chat scroll ref
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, optimisticMessages]);

  // Timer
  useEffect(() => {
    if (!details?.match) return;
    const match = details.match;
    if (match.status !== "running" || !match.started_at) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - match.started_at!) / 1000);
      const remaining = match.time_limit - elapsed;
      setTimeLeft(Math.max(0, remaining));

      // Auto-finish when time's up
      if (remaining <= 0) {
        finishMatch({ match_id: matchId as any }).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [details?.match, matchId, finishMatch]);

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

  // Clear optimistic messages when real messages update
  useEffect(() => {
    if (chatMessages) {
      setOptimisticMessages([]);
    }
  }, [chatMessages]);

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

  if (!details || !questions) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-pink-500" size={48} />
      </div>
    );
  }

  const { match, players } = details;
  const effectiveTimeLeft = timeLeft;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSolveQuestion = (questionIndex: number) => {
    router.push(`/match/${matchId}?q=${questionIndex}`);
  };

  // Optimistic chat send
  const handleSendChat = async () => {
    if (!chatInput.trim() || !publicId || isSending) return;
    const messageText = chatInput.trim();
    
    // Optimistic: clear input immediately, add to local messages
    setChatInput("");
    setIsSending(true);
    
    const optimisticMsg = {
      _id: `optimistic-${Date.now()}`,
      username: sessionData?.user?.name || "You",
      message: messageText,
      sent_at: Date.now(),
      isOptimistic: true,
    };
    setOptimisticMessages((prev) => [...prev, optimisticMsg]);

    try {
      await sendChat({
        public_id: publicId,
        match_id: matchId as any,
        message: messageText,
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to send message");
      // Remove optimistic message on failure
      setOptimisticMessages((prev) => prev.filter((m) => m._id !== optimisticMsg._id));
    } finally {
      setIsSending(false);
    }
  };

  const copyInviteCode = () => {
    if (match.invite_code) {
      navigator.clipboard.writeText(match.invite_code);
      setCopiedCode(true);
      toast.success("Invite code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const sortedPlayers = [...players].sort(
    (a: any, b: any) => b.score - a.score || a.total_time - b.total_time,
  );

  // Merge real + optimistic messages
  const allMessages = [...(chatMessages || []), ...optimisticMessages];

  // Match finished view
  if (match.status === "finished") {
    return (
      <div className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(236,72,153,0.15),transparent_50%)]" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 text-yellow-900 mb-6 shadow-[0_0_50px_rgba(234,179,8,0.5)]">
              <Trophy size={48} />
            </div>
            <h1 className="text-5xl font-black mb-4">
              {match.arena_name || "Match"} — Final Results
            </h1>
            <p className="text-xl text-neutral-400">
              The dust has settled. Here are the final standings.
            </p>
          </div>

          <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 backdrop-blur-xl">
            <div className="flex flex-col gap-4">
              {sortedPlayers.map((p: any, i: number) => {
                const isMe = p.user_id === playerState?.user_id;
                const isWinner = i === 0 && p.score > 0;
                return (
                  <div
                    key={p._id || i}
                    className={`flex items-center justify-between p-4 rounded-2xl border ${
                      i === 0
                        ? "bg-gradient-to-r from-yellow-500/20 to-transparent border-yellow-500/50"
                        : isMe
                          ? "bg-white/5 border-neutral-600"
                          : "bg-black/50 border-neutral-800"
                    }`}
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
                          {isWinner && (
                            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded uppercase tracking-wider">
                              Winner
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
                      <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
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
              className="mt-8 w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-neutral-700"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active match — Arena Home
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.08),transparent_50%)]" />

      <div className="max-w-7xl mx-auto p-6 md:p-10 relative z-10">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/arena")}
              className="text-neutral-500 hover:text-white transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">
                {match.arena_name || `${match.difficulty} Arena`}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded uppercase">
                  {match.mode}
                </span>
                <span className="text-xs text-neutral-500">
                  {match.number_of_questions} Questions
                </span>
                {/* Invite Code inline */}
                {match.invite_code && (
                  <button
                    onClick={copyInviteCode}
                    className="flex items-center gap-1.5 text-xs font-mono text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded hover:bg-neutral-700 transition"
                  >
                    {copiedCode ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    {match.invite_code}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Timer */}
          <div
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl border font-mono text-2xl font-black ${
              effectiveTimeLeft !== null && effectiveTimeLeft < 60
                ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                : effectiveTimeLeft !== null && effectiveTimeLeft < 300
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-neutral-900 border-neutral-700 text-white"
            }`}
          >
            <Timer size={20} />
            {effectiveTimeLeft !== null
              ? formatTime(Math.max(0, effectiveTimeLeft))
              : "--:--"}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Questions Panel */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              {isKnockout ? (
                <><Target className="text-red-400" size={22} /> Knockout Bracket</>
              ) : (
                <><Zap className="text-pink-400" size={22} /> Challenge Questions</>
              )}
            </h2>

            {/* ========== KNOCKOUT MODE ========== */}
            {isKnockout && (
              <div className="space-y-6">
                {/* My Current 1v1 Panel */}
                {myBracket && (
                  <div className={`rounded-2xl border p-6 ${
                    myBracket.eliminated
                      ? "bg-red-500/5 border-red-500/30"
                      : myBracket.champion
                        ? "bg-yellow-500/10 border-yellow-500/40 shadow-[0_0_30px_rgba(234,179,8,0.15)]"
                        : "bg-gradient-to-br from-pink-500/10 to-purple-500/5 border-pink-500/30"
                  }`}>
                    {myBracket.champion ? (
                      <div className="text-center py-4">
                        <Crown size={48} className="mx-auto text-yellow-400 mb-3" />
                        <h3 className="text-2xl font-black text-yellow-400">🏆 CHAMPION!</h3>
                        <p className="text-neutral-400 text-sm mt-2">You won the knockout tournament!</p>
                      </div>
                    ) : myBracket.eliminated ? (
                      <div className="text-center py-4">
                        <XCircle size={40} className="mx-auto text-red-400 mb-3" />
                        <h3 className="text-xl font-black text-red-400">Eliminated</h3>
                        <p className="text-neutral-400 text-sm mt-2">
                          You were defeated by <span className="text-white font-bold">{(myBracket as any).winner_name}</span> in Round {myBracket.round}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Target size={18} className="text-red-400" />
                            <span className="text-xs font-black text-red-400 uppercase tracking-wider">
                              Round {myBracket.round}{(myBracket as any).totalRounds ? ` of ${(myBracket as any).totalRounds}` : ""}
                            </span>
                          </div>
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            myBracket.status === "running"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          }`}>
                            {myBracket.status === "running" ? "⚡ LIVE" : "Waiting..."}
                          </span>
                        </div>

                        {/* VS Display */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 text-center">
                            <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center font-black text-blue-400 text-xl mb-2">You</div>
                            <p className="text-sm font-bold text-white">You</p>
                            {myBracket.myProgress ? (
                              <span className={`text-xs font-bold mt-1 block ${
                                myBracket.myProgress.result === "Accepted" ? "text-green-400" : "text-yellow-400"
                              }`}>
                                {myBracket.myProgress.result === "Accepted"
                                  ? "✅ Solved"
                                  : `${myBracket.myProgress.testcases_passed} TC passed`}
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-500 mt-1 block">Not submitted</span>
                            )}
                          </div>

                          <div className="flex flex-col items-center gap-1">
                            <Swords size={28} className="text-pink-500" />
                            <span className="text-xs font-black text-pink-400">VS</span>
                          </div>

                          <div className="flex-1 text-center">
                            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mb-2">
                              {myBracket.opponent_profile_picture ? (
                                <img src={myBracket.opponent_profile_picture} alt="" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <span className="font-black text-xl">{myBracket.opponent_name?.[0]?.toUpperCase() || "?"}</span>
                              )}
                            </div>
                            <p className="text-sm font-bold text-white">{myBracket.opponent_name}</p>
                            {myBracket.opponent_rating > 0 && (
                              <span className="text-[10px] text-neutral-500">Rating: {myBracket.opponent_rating}</span>
                            )}
                            {myBracket.opponentProgress ? (
                              <span className={`text-xs font-bold mt-0.5 block ${
                                myBracket.opponentProgress.result === "Accepted" ? "text-green-400" : "text-yellow-400"
                              }`}>
                                {myBracket.opponentProgress.result === "Accepted"
                                  ? "✅ Solved"
                                  : `${myBracket.opponentProgress.testcases_passed} TC passed`}
                              </span>
                            ) : (
                              <span className="text-xs text-neutral-500 mt-0.5 block">Not submitted</span>
                            )}
                          </div>
                        </div>

                        {/* Fight Button */}
                        {myBracket.status === "running" && !myBracket.myProgress && (
                          <button
                            onClick={() => router.push(`/match/${matchId}?q=knockout`)}
                            className="w-full mt-6 py-4 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-400 hover:to-pink-500 text-white font-black text-lg rounded-xl shadow-[0_0_30px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-3"
                          >
                            <Swords size={22} /> FIGHT!
                          </button>
                        )}
                        {myBracket.myProgress && !myBracket.opponentProgress && (
                          <div className="w-full mt-6 py-4 bg-neutral-800 text-neutral-400 font-bold rounded-xl flex items-center justify-center gap-3">
                            <Loader2 className="animate-spin" size={18} /> Waiting for opponent to submit...
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Full Bracket Tree */}
                {bracketState && bracketState.length > 0 && (
                  <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-5">
                    <h3 className="text-base font-bold text-neutral-300 mb-4 flex items-center gap-2">
                      <Shield size={16} className="text-purple-400" /> Tournament Bracket
                    </h3>
                    {(() => {
                      const rounds = new Map<number, any[]>();
                      bracketState.forEach((b: any) => {
                        if (!rounds.has(b.round)) rounds.set(b.round, []);
                        rounds.get(b.round)!.push(b);
                      });
                      const sortedRounds = [...rounds.entries()].sort((a, b) => a[0] - b[0]);
                      const roundLabels = (r: number, total: number) => {
                        if (r === total) return "Finals";
                        if (r === total - 1) return "Semifinals";
                        return `Round ${r}`;
                      };

                      return (
                        <div className="space-y-4">
                          {sortedRounds.map(([round, matches]) => (
                            <div key={round}>
                              <div className="text-xs font-black text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ChevronRight size={12} />
                                {roundLabels(round, sortedRounds.length)}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {matches.sort((a: any, b: any) => a.match_index - b.match_index).map((b: any) => {
                                  const isMyMatch = myBracket && (
                                    (b.player1_id && b.player1_id === myBracket.my_id) ||
                                    (b.player2_id && b.player2_id === myBracket.my_id)
                                  );
                                  return (
                                    <div
                                      key={b._id}
                                      className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${
                                        isMyMatch
                                          ? "border-pink-500/40 bg-pink-500/5"
                                          : b.status === "completed"
                                            ? "border-neutral-700 bg-neutral-800/50"
                                            : b.status === "running"
                                              ? "border-green-500/30 bg-green-500/5"
                                              : "border-neutral-800 bg-neutral-900/50"
                                      }`}
                                    >
                                      <div className="flex-1 flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <span className={`font-bold truncate max-w-[80px] ${
                                            b.winner_id === b.player1_id ? "text-green-400" : b.status === "completed" ? "text-neutral-500 line-through" : "text-white"
                                          }`}>
                                            {b.player1_name || "TBD"}
                                          </span>
                                          <span className="text-neutral-600">vs</span>
                                          <span className={`font-bold truncate max-w-[80px] ${
                                            b.winner_id === b.player2_id ? "text-green-400" : b.status === "completed" ? "text-neutral-500 line-through" : "text-white"
                                          }`}>
                                            {b.player2_name || "TBD"}
                                          </span>
                                        </div>
                                        {b.winner_name && (
                                          <span className="text-[10px] text-green-400 flex items-center gap-1">
                                            <Trophy size={10} /> {b.winner_name}
                                          </span>
                                        )}
                                      </div>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                        b.status === "running"
                                          ? "bg-green-500/20 text-green-400"
                                          : b.status === "completed"
                                            ? "bg-neutral-700 text-neutral-400"
                                            : "bg-neutral-800 text-neutral-500"
                                      }`}>
                                        {b.status === "running" ? "⚡ Live" : b.status === "completed" ? "Done" : "Pending"}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* ========== STANDARD MODE (unchanged) ========== */}
            {!isKnockout && questions.map((q: any, i: number) => {
              const isUnlocked =
                i < (playerState?.questions_unlocked || 1);
              const isSubmitted =
                playerState?.submittedQuestions?.[q._id];
              const isCurrent =
                i === (playerState?.current_question_index || 0) &&
                !isSubmitted;

              let statusClass = "";
              let StatusIcon = Lock;
              let statusText = "Locked";

              if (isSubmitted) {
                statusClass =
                  isSubmitted.result === "Accepted"
                    ? "border-green-500/40 bg-green-500/5"
                    : "border-orange-500/40 bg-orange-500/5";
                StatusIcon = CheckCircle;
                statusText =
                  isSubmitted.result === "Accepted"
                    ? "Solved"
                    : "Submitted";
              } else if (isCurrent && isUnlocked) {
                statusClass =
                  "border-blue-500/40 bg-blue-500/5 hover:border-blue-500/60";
                StatusIcon = Unlock;
                statusText = "Current";
              } else if (isUnlocked) {
                statusClass =
                  "border-neutral-600 bg-neutral-900/50 hover:border-neutral-500";
                StatusIcon = Unlock;
                statusText = "Available";
              } else {
                statusClass =
                  "border-neutral-800 bg-neutral-900/30 opacity-50";
                StatusIcon = Lock;
                statusText = "Locked";
              }

              const questionScore =
                match.question_scores?.[q._id as string] ||
                (i + 1) * 100;

              return (
                <div
                  key={q._id}
                  className={`flex items-center justify-between p-5 rounded-2xl border transition-all ${statusClass}`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                        isSubmitted
                          ? isSubmitted.result === "Accepted"
                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                            : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                          : isCurrent
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-neutral-800 text-neutral-500 border border-neutral-700"
                      }`}
                    >
                      Q{i + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">
                        {q.topic}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            q.difficulty === "Easy"
                              ? "text-green-400 bg-green-500/10"
                              : q.difficulty === "Medium"
                                ? "text-yellow-400 bg-yellow-500/10"
                                : q.difficulty === "Hard"
                                  ? "text-red-400 bg-red-500/10"
                                  : "text-purple-400 bg-purple-500/10"
                          }`}
                        >
                          {q.difficulty}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {questionScore} pts
                        </span>
                        <span
                          className={`text-xs font-bold ${
                            isSubmitted
                              ? isSubmitted.result === "Accepted"
                                ? "text-green-400"
                                : "text-orange-400"
                              : isCurrent
                                ? "text-blue-400"
                                : "text-neutral-600"
                          }`}
                        >
                          {statusText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isUnlocked && !isSubmitted && (
                    <button
                      onClick={() => handleSolveQuestion(i)}
                      className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(236,72,153,0.3)] flex items-center gap-2"
                    >
                      <Play size={16} fill="currentColor" /> Solve
                    </button>
                  )}
                  {isSubmitted && (
                    <StatusIcon
                      size={24}
                      className={
                        isSubmitted.result === "Accepted"
                          ? "text-green-400"
                          : "text-orange-400"
                      }
                    />
                  )}
                  {!isUnlocked && (
                    <Lock size={20} className="text-neutral-600" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar: Standings + Chat */}
          <div className="space-y-6">
            {/* Standings */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 backdrop-blur-xl">
              <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Users className="text-pink-400" size={18} /> Live
                Standings
              </h3>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {(standings || sortedPlayers).map(
                  (p: any, i: number) => {
                    const isMe = p.public_id === publicId || p.user_id === playerState?.user_id;
                    return (
                      <div
                        key={p._id || i}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          i === 0
                            ? "bg-yellow-500/10 border-yellow-500/30"
                            : isMe
                              ? "bg-blue-500/5 border-blue-500/20"
                              : "bg-black/30 border-neutral-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-black text-sm w-6 text-center ${
                              i === 0
                                ? "text-yellow-500"
                                : i === 1
                                  ? "text-neutral-300"
                                  : i === 2
                                    ? "text-amber-600"
                                    : "text-neutral-600"
                            }`}
                          >
                            #{i + 1}
                          </span>
                          <div>
                            <div className="text-sm font-bold text-white truncate max-w-[100px]">
                              {p.username}
                              {isMe && (
                                <span className="text-[9px] text-blue-400 ml-1">
                                  (You)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-neutral-500">
                              {p.solved_count || 0}/
                              {match.number_of_questions} Solved
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold text-green-400">
                          {p.score} pt
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 backdrop-blur-xl">
              <button
                onClick={() => setShowChat(!showChat)}
                className="w-full flex items-center justify-between text-lg font-bold mb-3"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="text-purple-400" size={18} />{" "}
                  Arena Chat
                </span>
                <span className="text-xs text-neutral-500">
                  {allMessages.length} msgs
                </span>
              </button>

              {showChat && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <div className="h-48 overflow-y-auto mb-3 space-y-2 pr-1">
                    {allMessages.length === 0 ? (
                      <p className="text-xs text-neutral-600 text-center py-6">
                        No messages yet. Say hi! 👋
                      </p>
                    ) : (
                      allMessages.map((msg: any) => (
                        <div
                          key={msg._id}
                          className={`text-xs ${msg.isOptimistic ? "opacity-60" : ""}`}
                        >
                          <span className="font-bold text-pink-400">
                            {msg.username}:{" "}
                          </span>
                          <span className="text-neutral-300">
                            {msg.message}
                          </span>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSendChat()
                      }
                      placeholder="Type a message..."
                      maxLength={500}
                      disabled={isSending}
                      className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500 disabled:opacity-50"
                    />
                    <button
                      onClick={handleSendChat}
                      disabled={isSending || !chatInput.trim()}
                      className="p-2 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
