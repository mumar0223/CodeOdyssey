"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/auth";
import {
  Swords,
  Clock,
  Users,
  Zap,
  Plus,
  X,
  Globe,
  Lock,
  Shield,
  Trophy,
  Copy,
  Check,
  Trash2,
  Eye,
  Key,
  Search,
  Crown,
  Sparkles,
  Calendar,
  Briefcase,
  UserCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function ArenaLobby() {
  const router = useRouter();
  const openArenas = useQuery(api.matches.getOpenArenas);

  const { data: sessionData, isPending } = useSession();
  const publicId = sessionData?.user?.id;

  const upcomingTournaments = useQuery(api.matches.getUpcomingTournaments, publicId ? { public_id: publicId } : {});
  const createMatch = useMutation(api.matches.createMatch);
  const createTournament = useMutation(api.matches.createTournament);
  const seedTournaments = useMutation(api.matches.seedTournaments);
  const ensureUser = useMutation(api.users.ensureUser);
  const closeArena = useMutation(api.matches.closeArena);
  const joinByCode = useMutation(api.matches.joinMatchByInviteCode);
  const registerForTournament = useMutation(api.matches.registerForTournament);
  const addOrganizer = useMutation(api.matches.addOrganizerToTournament);

  // Get user profile for rating check
  // @ts-ignore
  const userProfile = useQuery(
    api.users.getUserProfile,
    publicId ? { public_id: publicId } : "skip",
  );

  // @ts-ignore
  const hostedArenas = useQuery(
    api.matches.getHostedArenas,
    publicId ? { public_id: publicId } : "skip",
  );

  const handleProtectedAction = (action: () => void) => {
    if (isPending) return;
    if (!sessionData?.user) {
      router.push("/login");
    } else {
      action();
    }
  };

  // Create modal state
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState("Standard");
  const [difficulty, setDifficulty] = useState("Medium");
  const [numQuestions, setNumQuestions] = useState(2);
  const [timeLimit, setTimeLimit] = useState(600);
  const [visibility, setVisibility] = useState("public");
  const [arenaName, setArenaName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(20);
  const [arenaPassword, setArenaPassword] = useState("");

  // Tournament create state
  const [isCreatingTournament, setIsCreatingTournament] = useState(false);
  const [isSubmittingTournament, setIsSubmittingTournament] = useState(false);
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentDifficulty, setTournamentDifficulty] = useState("Hard");
  const [tournamentQuestions, setTournamentQuestions] = useState(4);
  const [tournamentTimeLimit, setTournamentTimeLimit] = useState(3600);
  const [tournamentPrizePool, setTournamentPrizePool] = useState(1000);
  const [tournamentScheduledFor, setTournamentScheduledFor] = useState("");
  const [tournamentRole, setTournamentRole] = useState("competitor");

  // Invite code join state
  const [inviteCode, setInviteCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [joinTab, setJoinTab] = useState<"match" | "organizer">("match");

  // Organizer join state
  const [orgInviteToken, setOrgInviteToken] = useState("");
  const [orgJoinPassword, setOrgJoinPassword] = useState("");
  const [joiningAsOrg, setJoiningAsOrg] = useState(false);

  // Tournament organizer password state
  const [tournamentOrgPassword, setTournamentOrgPassword] = useState("");

  // Copied invite code
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const canCreateTournament = userProfile && (userProfile.rating || 0) >= 1800;

  const handleCreateArena = async () => {
    if (!sessionData?.user) {
      router.push("/login");
      return;
    }
    setIsSubmitting(true);
    try {
      const pid = sessionData.user.id;
      await ensureUser({ public_id: pid, name: sessionData.user.name });

      const matchId = await createMatch({
        public_id: pid,
        mode,
        difficulty,
        number_of_questions: numQuestions,
        time_limit: timeLimit,
        allowed_languages: ["JavaScript", "Python", "Java", "C++"],
        visibility,
        arena_name: arenaName || undefined,
        password: visibility === "private" ? arenaPassword || undefined : undefined,
        max_players: maxPlayers,
      });

      if (matchId) {
        toast.success("Arena created!");
        setIsCreating(false);
        router.push(`/match/${matchId}`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create match");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTournament = async () => {
    if (!sessionData?.user) {
      router.push("/login");
      return;
    }
    if (!tournamentName.trim() || !tournamentScheduledFor) {
      toast.error("Please fill in tournament name and schedule");
      return;
    }
    setIsSubmittingTournament(true);
    try {
      const pid = sessionData.user.id;
      await ensureUser({ public_id: pid, name: sessionData.user.name });

      const matchId = await createTournament({
        public_id: pid,
        tournament_name: tournamentName.trim(),
        difficulty: tournamentDifficulty,
        number_of_questions: tournamentQuestions,
        time_limit: tournamentTimeLimit,
        prize_pool: tournamentPrizePool,
        scheduled_for: new Date(tournamentScheduledFor).getTime(),
        role: tournamentRole,
        organizer_password: tournamentRole === "organizer" ? tournamentOrgPassword : undefined,
      });

      if (matchId) {
        toast.success("Tournament created and scheduled!");
        setIsCreatingTournament(false);
        setTournamentName("");
        setTournamentScheduledFor("");
        setTournamentRole("competitor");
        // Do NOT redirect, wait for the scheduled time
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to create tournament");
    } finally {
      setIsSubmittingTournament(false);
    }
  };

  const joinArena = async (matchId: string, routeStr?: string) => {
    if (!sessionData?.user) {
      router.push("/login");
      return;
    }
    router.push(routeStr ? routeStr : `/match/${matchId}`);
  };

  const handleRegisterTournament = async (matchId: string) => {
    if (!publicId) {
      router.push("/login");
      return;
    }
    try {
      await ensureUser({ public_id: publicId, name: sessionData?.user?.name || "" });
      const result = await registerForTournament({
        public_id: publicId,
        match_id: matchId as any,
      });
      if (result === "already_registered") {
        toast.info("Already registered for this tournament.");
      } else {
        toast.success("Successfully registered for tournament!");
      }
      // router.push(`/match/${matchId}`); // removed redirect, use explicit join button later
    } catch (e: any) {
      toast.error(e.message || "Registration failed");
    }
  };

  const handleJoinByCode = async () => {
    if (!publicId || !inviteCode.trim()) return;
    setJoiningByCode(true);
    try {
      const matchId = await joinByCode({
        public_id: publicId,
        invite_code: inviteCode.trim(),
        password: joinPassword || undefined,
      });
      if (matchId) {
        toast.success("Joined arena!");
        setShowJoinDialog(false);
        setInviteCode("");
        setJoinPassword("");
        router.push(`/match/${matchId}`);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to join");
    } finally {
      setJoiningByCode(false);
    }
  };

  const handleCloseArena = async (matchId: string) => {
    if (!publicId) return;
    if (!confirm("Are you sure you want to close this arena? All players will be removed.")) return;
    try {
      await closeArena({ public_id: publicId, match_id: matchId as any });
      toast.success("Arena closed");
    } catch (e: any) {
      toast.error(e.message || "Failed to close arena");
    }
  };

  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getTournamentButtonState = (t: any) => {
    // Check if tournament is running
    if (t.status === "running") {
      // 2 minute join window (120,000 ms), but we should check if they were registered
      if (t.started_at && now - t.started_at < 120000) {
        if (t.isRegistered || t.isHost) {
          return { label: "Re-Join Match", action: () => joinArena(t._id, `/play/${t._id}?token=${t.play_token}`), disabled: false, color: "bg-green-500 hover:bg-green-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]" };
        } else {
           return { label: "Registration Closed", action: undefined, disabled: true, color: "bg-neutral-800 text-neutral-500 cursor-not-allowed" };
        }
      }
      return { label: "Closed", action: undefined, disabled: true, color: "bg-neutral-800 text-neutral-500 cursor-not-allowed" };
    }
    
    if (t.status === "finished" || t.status === "cancelled") {
      return { label: "Ended", action: undefined, disabled: true, color: "bg-neutral-800 text-neutral-500 cursor-not-allowed" };
    }

    // Waiting state
    if (t.scheduled_for) {
      if (now >= t.scheduled_for) {
        // Tournament scheduled time reached, 2-minute joining window starts
        if (now - t.scheduled_for < 120000) {
          if (t.isRegistered || t.isHost) {
            return { label: "Enter Lobby", action: () => joinArena(t._id, `/lobby/${t._id}?token=${t.lobby_token}`), disabled: false, color: "bg-green-500 hover:bg-green-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]" };
          } else {
            return { label: "Registration Closed", action: undefined, disabled: true, color: "bg-neutral-800 text-neutral-500 cursor-not-allowed" };
          }
        } else {
          // Missed the 2 minute window even if registered
          return { label: "Closed", action: undefined, disabled: true, color: "bg-neutral-800 text-neutral-500 cursor-not-allowed" };
        }
      }
    }

    // Strictly waiting and the time has not arrived
    if (t.isRegistered) {
      return { 
        label: "Registered", 
        action: undefined, 
        disabled: true, 
        color: "bg-green-900/50 text-green-500 border border-green-500/50 cursor-not-allowed" 
      };
    }
    
    // Default register
    return { 
      label: "Register Now", 
      action: () => handleProtectedAction(() => handleRegisterTournament(t._id)), 
      disabled: false, 
      color: "bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]" 
    };
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-12 relative z-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-purple-500 flex items-center gap-4">
            <Swords size={40} className="text-pink-500" />
            Coding Arena
          </h1>
          <p className="text-neutral-400 mt-2 text-lg">
            Compete against other developers in real-time coding battles.
          </p>
        </div>
        <div className="flex gap-3 mt-6 md:mt-0 flex-wrap">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 border border-neutral-700 hover:border-neutral-500 hover:bg-neutral-800 rounded-full font-bold transition-all text-neutral-300"
          >
            Back Home
          </button>
          <button
            onClick={() => handleProtectedAction(() => setShowJoinDialog(true))}
            className="px-6 py-3 border border-purple-500/50 hover:bg-purple-500/20 rounded-full font-bold flex items-center gap-2 text-purple-300 transition-all"
          >
            <Key size={16} /> Join by Code
          </button>
          <button
            onClick={() => handleProtectedAction(() => setIsCreating(true))}
            className="px-6 py-3 bg-white text-black hover:bg-neutral-200 rounded-full font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transition-all"
          >
            <Plus size={18} /> Create Match
          </button>
          {canCreateTournament && (
            <button
              onClick={() => handleProtectedAction(() => setIsCreatingTournament(true))}
              className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:from-yellow-400 hover:to-amber-500 rounded-full font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all"
            >
              <Trophy size={18} /> Create Tournament
            </button>
          )}
        </div>
      </div>

      {/* My Hosted Arenas & Tournaments */}
      {hostedArenas && hostedArenas.length > 0 && (
        <div className="max-w-7xl mx-auto mb-12 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
            <Crown className="text-amber-400" size={28} /> My Hosted Matches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hostedArenas.map((arena: any) => (
              <div
                key={arena._id}
                className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 rounded-2xl p-5 border border-amber-500/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {arena.arena_name || `${arena.difficulty} Arena`}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          {arena.mode}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${arena.visibility === "private" ? "text-red-400 bg-red-500/10" : "text-green-400 bg-green-500/10"}`}>
                          {arena.visibility}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-1 rounded-lg uppercase">
                      Host
                    </span>
                  </div>

                  {/* Invite Code */}
                  {arena.invite_code && (
                    <div className="flex items-center gap-2 mt-3 mb-3">
                      <span className="text-xs text-neutral-400">Code:</span>
                      <span className="font-mono font-bold text-sm text-white bg-neutral-800 px-3 py-1 rounded-lg tracking-widest">
                        {arena.invite_code}
                      </span>
                      <button
                        onClick={() => copyInviteCode(arena.invite_code!)}
                        className="text-neutral-500 hover:text-white transition"
                      >
                        {copiedCode === arena.invite_code ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-neutral-400">
                    <span className="flex items-center gap-1"><Users size={14} /> {arena.playerCount}/{arena.maxPlayers}</span>
                    <span className="flex items-center gap-1"><Clock size={14} /> {arena.time_limit / 60}m</span>
                    <span className="flex items-center gap-1"><Zap size={14} /> {arena.number_of_questions}Q</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => router.push(`/match/${arena._id}`)}
                    className="flex-1 py-2.5 bg-white/10 hover:bg-amber-500/30 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-amber-500/20"
                  >
                    <Eye size={16} /> View
                  </button>
                  <button
                    onClick={() => handleCloseArena(arena._id)}
                    className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 font-bold rounded-xl transition-all border border-red-500/20"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Tournaments */}
      <div className="max-w-7xl mx-auto mt-12 mb-16 relative z-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
        <h2 className="text-3xl font-black mb-6 flex items-center gap-3">
          <Trophy className="text-yellow-500" size={32} /> Grand Tournaments
        </h2>
        {(() => {
          const filteredTournaments = upcomingTournaments
            ? upcomingTournaments.filter((t: any) => {
                if (t.status === "finished" || t.status === "cancelled") return false;
                if (t.status === "waiting" && t.scheduled_for) {
                  if (now > t.scheduled_for + 3 * 60 * 1000) return false;
                }
                if (t.status === "running" && t.started_at && t.time_limit) {
                  const endTime = t.started_at + (t.time_limit * 1000) + (5 * 60 * 1000);
                  if (now > endTime) return false;
                }
                return true;
              })
            : undefined;

          if (filteredTournaments && filteredTournaments.length > 0) {
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTournaments.map((t: any) => (
                  <div
                    key={t._id}
                    className="bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/30 rounded-3xl p-8 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/20 blur-[50px] pointer-events-none group-hover:bg-yellow-500/30 transition-all" />
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="text-xs font-black uppercase tracking-wider text-yellow-500 mb-2 block bg-yellow-500/10 w-fit px-2 py-1 rounded">
                          Official Event
                        </span>
                        <h3 className="text-2xl font-black text-white">
                          {t.tournament_name}
                        </h3>
                      </div>
                      <div className="bg-black/50 border border-yellow-500/30 px-4 py-2 rounded-xl text-center">
                        <div className="text-[10px] text-neutral-400 font-bold uppercase">
                          Prize Pool
                        </div>
                        <div className="text-lg font-black text-yellow-400">
                          {t.prize_pool} Coins
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-6 text-sm">
                      <span className="flex items-center gap-2 text-neutral-300">
                        <Clock size={16} className="text-neutral-500" />{" "}
                        {new Date(t.scheduled_for).toLocaleString()} 
                        {t.status === "waiting" && t.scheduled_for > now && (
                          <span className="ml-2 text-xs text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-md">
                            Starts in {Math.ceil((t.scheduled_for - now) / 60000)}m
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 text-neutral-300">
                        <Zap size={16} className="text-neutral-500" />{" "}
                        {t.difficulty}
                      </span>
                      <span className="flex items-center gap-2 text-neutral-300">
                        <Users size={16} className="text-neutral-500" />{" "}
                        {t.playerCount} Registered
                      </span>
                    </div>

                    {(() => {
                      const state = getTournamentButtonState(t);
                      return (
                        <button
                          onClick={state.action}
                          disabled={state.disabled}
                          className={`mt-6 w-full py-4 font-black rounded-xl transition-all ${state.color}`}
                        >
                          {state.label}
                        </button>
                      );
                    })()}
                  </div>
                ))}
              </div>
            );
          } else {
            return (
              <div className="py-12 text-center bg-neutral-900/50 rounded-3xl border border-neutral-800 backdrop-blur-sm">
                <Trophy size={48} className="mx-auto text-neutral-600 mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Upcoming Tournaments</h3>
                <p className="text-neutral-400 text-sm">
                  {canCreateTournament
                    ? "You have the rating to create a tournament! Click the button above."
                    : "Reach 1800+ rating to create tournaments. Check back later for scheduled events."}
                </p>
              </div>
            );
          }
        })()}
      </div>

      {/* Active Arenas */}
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black flex items-center gap-3 text-white">
            <Swords className="text-pink-500" size={32} /> Active Arenas
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {openArenas === undefined ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl bg-neutral-900 border border-neutral-800 animate-pulse"
              />
            ))
          ) : openArenas.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-neutral-900/50 rounded-3xl border border-neutral-800 backdrop-blur-sm">
              <Shield size={64} className="mx-auto text-neutral-600 mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">
                No Active Arenas Right Now
              </h3>
              <p className="text-neutral-400 mb-6">
                Be the first to create a public match and challenge the ranking
                leaders!
              </p>
              <button
                onClick={() => handleProtectedAction(() => setIsCreating(true))}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold rounded-full shadow-[0_0_20px_rgba(236,72,153,0.3)] transition border border-pink-500/50"
              >
                Start Arena Match
              </button>
            </div>
          ) : (
            openArenas.map((arena: any) => {
              return (
                <div
                  key={arena._id}
                  className="group bg-neutral-900/80 backdrop-blur-md rounded-2xl p-6 border border-neutral-800 hover:border-pink-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(236,72,153,0.15)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">
                          {arena.arena_name || `${arena.difficulty} Arena`}
                        </h3>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] font-black uppercase text-pink-400 bg-pink-500/10 px-2 py-1 rounded">
                            {arena.mode}
                          </span>
                          {arena.hosted_by_app && (
                            <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded flex items-center gap-1">
                              <Sparkles size={10} /> AI Hosted
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center text-pink-400 border border-pink-500/20">
                        <Swords size={24} />
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500 flex items-center gap-2">
                          <Users size={16} /> Players
                        </span>
                        <span className="font-mono text-white bg-neutral-800 px-2 py-0.5 rounded text-xs">
                          {arena.playerCount}/{arena.maxPlayers}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500 flex items-center gap-2">
                          <Clock size={16} /> Time Limit
                        </span>
                        <span className="font-mono text-white bg-neutral-800 px-2 py-0.5 rounded text-xs">
                          {arena.time_limit / 60}m
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500 flex items-center gap-2">
                          <Zap size={16} /> Questions
                        </span>
                        <span className="font-mono text-white bg-neutral-800 px-2 py-0.5 rounded text-xs">
                          {arena.number_of_questions}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-500 flex items-center gap-2">
                          <Crown size={16} /> Host
                        </span>
                        <span className="font-mono text-white bg-neutral-800 px-2 py-0.5 rounded text-xs">
                          {arena.hostUsername}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => joinArena(arena._id)}
                    className="w-full py-3 bg-white/5 hover:bg-pink-500 text-white font-bold rounded-xl transition-all border border-neutral-700 hover:border-transparent flex items-center justify-center gap-2 mt-auto"
                  >
                    Join Match
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Join by Invite Code Dialog */}
      {showJoinDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative">
            <button
              onClick={() => { setShowJoinDialog(false); setInviteCode(""); setJoinPassword(""); setOrgInviteToken(""); setOrgJoinPassword(""); }}
              className="absolute top-6 right-6 text-neutral-500 hover:text-white transition"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-black mb-4 flex items-center gap-3">
              <Key className="text-purple-400" size={24} /> Join Match
            </h2>

            {/* Tabs */}
            <div className="flex gap-1 bg-neutral-800 rounded-xl p-1 mb-6">
              <button
                onClick={() => setJoinTab("match")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${joinTab === "match" ? "bg-white text-black" : "text-neutral-400 hover:text-white"}`}
              >
                Match Invite
              </button>
              <button
                onClick={() => setJoinTab("organizer")}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${joinTab === "organizer" ? "bg-purple-500 text-white" : "text-neutral-400 hover:text-white"}`}
              >
                <Shield size={14} className="inline mr-1" /> Organizer
              </button>
            </div>

            {joinTab === "match" ? (
              /* — Match Invite Tab — */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">
                    Invite Code
                  </label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="e.g. ABC123"
                    maxLength={6}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-4 text-white text-center text-2xl font-mono tracking-[0.5em] uppercase outline-none focus:border-purple-500 transition placeholder:text-neutral-600 placeholder:text-base placeholder:tracking-normal"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">
                    Password <span className="text-neutral-600">(if required)</span>
                  </label>
                  <input
                    type="password"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    placeholder="Leave empty if no password"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition"
                  />
                </div>
                <button
                  onClick={handleJoinByCode}
                  disabled={joiningByCode || inviteCode.length < 3}
                  className="w-full mt-2 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-black text-lg rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {joiningByCode ? "Joining..." : "Join Arena"}
                </button>
              </div>
            ) : (
              /* — Organizer Invite Tab — */
              <div className="space-y-4">
                <p className="text-xs text-neutral-500 mb-2">
                  Enter the organizer invite token and the mandatory password set by the host to join as an organizer.
                </p>
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">
                    Organizer Invite Token
                  </label>
                  <input
                    type="text"
                    value={orgInviteToken}
                    onChange={(e) => setOrgInviteToken(e.target.value)}
                    placeholder="Paste token here"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white font-mono text-sm outline-none focus:border-purple-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">
                    Organizer Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={orgJoinPassword}
                    onChange={(e) => setOrgJoinPassword(e.target.value)}
                    placeholder="Required"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl p-3 text-white outline-none focus:border-purple-500 transition"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!publicId || !orgInviteToken.trim() || !orgJoinPassword.trim()) {
                      toast.error("Please fill in both the invite token and password.");
                      return;
                    }
                    setJoiningAsOrg(true);
                    try {
                      const matchId = await addOrganizer({
                        public_id: publicId,
                        organizer_invite_token: orgInviteToken.trim(),
                        organizer_password: orgJoinPassword.trim(),
                      });
                      toast.success("Joined as Organizer!");
                      setShowJoinDialog(false);
                      setOrgInviteToken("");
                      setOrgJoinPassword("");
                    } catch (e: any) {
                      toast.error(e.message || "Failed to join as organizer");
                    } finally {
                      setJoiningAsOrg(false);
                    }
                  }}
                  disabled={joiningAsOrg || !orgInviteToken.trim() || !orgJoinPassword.trim()}
                  className="w-full mt-2 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-lg rounded-xl shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {joiningAsOrg ? "Joining..." : "Join as Organizer"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Arena Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreating(false)}
              className="absolute top-6 right-6 text-neutral-500 hover:text-white transition"
            >
              <X size={24} />
            </button>
            <h2 className="text-3xl font-black mb-6">Configure Match</h2>

            <div className="space-y-5">
              {/* Arena Name */}
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Arena Name <span className="text-neutral-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={arenaName}
                  onChange={(e) => setArenaName(e.target.value)}
                  placeholder={`${difficulty} Arena`}
                  maxLength={50}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-pink-500 transition"
                />
              </div>

              {/* Mode */}
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Match Mode
                </label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {["Standard", "1v1 Duel", "Battle Royale", "Practice", "Knockout"].map(
                    (m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border ${mode === m ? "bg-white text-black border-white" : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700"}`}
                      >
                        {m}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Easy", "Medium", "Hard"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`py-2 px-3 rounded-lg text-sm font-bold transition-all border ${difficulty === d ? "bg-white text-black border-white" : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Match Length */}
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Match Length
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setNumQuestions(n)}
                      className={`py-2 px-3 rounded-lg text-sm font-bold transition-all border ${numQuestions === n ? "bg-purple-500 text-white border-purple-400" : "bg-neutral-800 text-neutral-400 border-neutral-700"}`}
                    >
                      {n} {n === 1 ? "Question" : "Questions"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Limit */}
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Time Limit
                </label>
                <select
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-pink-500 transition font-mono"
                >
                  <option value={300}>5 Minutes</option>
                  <option value={600}>10 Minutes</option>
                  <option value={1200}>20 Minutes</option>
                  <option value={1800}>30 Minutes</option>
                  <option value={3600}>60 Minutes</option>
                </select>
              </div>

              {/* Max Players */}
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Max Players
                </label>
                <select
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-pink-500 transition font-mono"
                >
                  <option value={2}>2 Players</option>
                  <option value={5}>5 Players</option>
                  <option value={10}>10 Players</option>
                  <option value={20}>20 Players</option>
                  <option value={50}>50 Players</option>
                  <option value={100}>100 Players</option>
                </select>
              </div>

              {/* Visibility */}
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setVisibility("public")}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-bold transition border ${visibility === "public" ? "bg-green-500/20 text-green-400 border-green-500/50" : "bg-neutral-800 text-neutral-400 border-neutral-700"}`}
                  >
                    <Globe size={16} /> Public
                  </button>
                  <button
                    onClick={() => setVisibility("private")}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-bold transition border ${visibility === "private" ? "bg-red-500/20 text-red-400 border-red-500/50" : "bg-neutral-800 text-neutral-400 border-neutral-700"}`}
                  >
                    <Lock size={16} /> Private
                  </button>
                </div>
              </div>

              {/* Password (only for private) */}
              {visibility === "private" && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <label className="block text-sm font-bold text-neutral-400 mb-2">
                    Arena Password <span className="text-neutral-600">(optional extra security)</span>
                  </label>
                  <input
                    type="password"
                    value={arenaPassword}
                    onChange={(e) => setArenaPassword(e.target.value)}
                    placeholder="Leave empty for no password"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-red-500 transition"
                  />
                  <p className="text-[11px] text-neutral-500 mt-2">
                    Users will need the invite code to join. Password adds an extra layer of security.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleCreateArena}
              disabled={isSubmitting}
              className="w-full mt-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black text-lg rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_30px_rgba(236,72,153,0.6)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Launch Arena"}
            </button>
          </div>
        </div>
      )}

      {/* Create Tournament Modal */}
      {isCreatingTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-yellow-500/20 rounded-3xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsCreatingTournament(false)}
              className="absolute top-6 right-6 text-neutral-500 hover:text-white transition"
            >
              <X size={24} />
            </button>
            <h2 className="text-3xl font-black mb-2 flex items-center gap-3">
              <Trophy className="text-yellow-500" /> Create Tournament
            </h2>
            <p className="text-sm text-neutral-400 mb-6">
              As a 1800+ rated player, you can host official tournaments.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Tournament Name
                </label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder="e.g. Weekend Grand Prix"
                  maxLength={60}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Your Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTournamentRole("competitor")}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${tournamentRole === "competitor" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/50" : "bg-neutral-800 text-neutral-400 border-neutral-700"}`}
                  >
                    <UserCircle size={20} className="mb-1" />
                    <span className="text-sm font-bold">Competitor</span>
                  </button>
                  <button
                    onClick={() => setTournamentRole("organizer")}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${tournamentRole === "organizer" ? "bg-purple-500/20 text-purple-400 border-purple-500/50" : "bg-neutral-800 text-neutral-400 border-neutral-700"}`}
                  >
                    <Briefcase size={20} className="mb-1" />
                    <span className="text-sm font-bold">Organizer</span>
                  </button>
                </div>
              </div>

              {/* Organizer Password — shown only when organizer role selected */}
              {tournamentRole === "organizer" && (
                <div className="animate-in slide-in-from-top-4 duration-300">
                  <label className="block text-sm font-bold text-neutral-400 mb-2">
                    <Lock size={14} className="inline mr-1" /> Organizer Password <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={tournamentOrgPassword}
                    onChange={(e) => setTournamentOrgPassword(e.target.value)}
                    placeholder="Set a password for organizer access"
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-purple-500 transition"
                  />
                  <p className="text-[11px] text-neutral-500 mt-2">
                    Other organizers will need this password + invite token to join as organizers.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Medium", "Hard", "Very Hard"].map((d) => (
                    <button
                      key={d}
                      onClick={() => setTournamentDifficulty(d)}
                      className={`py-2 px-3 rounded-lg text-sm font-bold transition-all border ${tournamentDifficulty === d ? "bg-yellow-500 text-black border-yellow-400" : "bg-neutral-800 text-neutral-400 border-neutral-700"}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">
                    Questions
                  </label>
                  <select
                    value={tournamentQuestions}
                    onChange={(e) => setTournamentQuestions(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition font-mono"
                  >
                    {[3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n} Questions</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-400 mb-2">
                    Time Limit
                  </label>
                  <select
                    value={tournamentTimeLimit}
                    onChange={(e) => setTournamentTimeLimit(Number(e.target.value))}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition font-mono"
                  >
                    <option value={1800}>30 Minutes</option>
                    <option value={3600}>60 Minutes</option>
                    <option value={5400}>90 Minutes</option>
                    <option value={7200}>120 Minutes</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  Prize Pool (Coins)
                </label>
                <input
                  type="number"
                  value={tournamentPrizePool}
                  onChange={(e) => setTournamentPrizePool(Number(e.target.value))}
                  min={100}
                  max={50000}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-400 mb-2">
                  <Calendar size={14} className="inline mr-1" /> Scheduled Start
                </label>
                <input
                  type="datetime-local"
                  value={tournamentScheduledFor}
                  onChange={(e) => setTournamentScheduledFor(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white outline-none focus:border-yellow-500 transition font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleCreateTournament}
              disabled={isSubmittingTournament}
              className="w-full mt-8 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-lg rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmittingTournament ? "Creating..." : "Launch Tournament"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
