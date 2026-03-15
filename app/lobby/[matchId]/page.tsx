"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/lib/auth";
import { Loader2, Swords, Clock, Users, ShieldAlert, LogOut, Shield, Crown } from "lucide-react";
import { toast } from "sonner";
import AnimatedBackground from "@/components/effects/AnimatedBackground";

export default function TournamentLobby() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.matchId as string;
  const lobbyToken = searchParams.get("token");
  const orgToken = searchParams.get("orgToken");

  const { data: sessionData, isPending } = useSession();
  const publicId = sessionData?.user?.id;

  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Real-time clock — ticks every second
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const details = useQuery(
    api.matches.getMatchDetails,
    publicId
      ? {
          match_id: matchId as any,
          public_id: publicId,
          lobby_token: lobbyToken || undefined,
        }
      : "skip",
  );

  const startMatch = useMutation(api.matches.startMatch);

  // Authentication and Security Check
  useEffect(() => {
    if (isPending) return;
    if (!sessionData?.user) {
      router.push("/login");
      return;
    }

    if (!lobbyToken && !orgToken) {
      setHasError(true);
      setErrorMessage("Access Denied: Missing lobby or organizer token.");
      return;
    }
  }, [sessionData, isPending, router, lobbyToken, orgToken]);

  // Handle Backend Verification Failures
  useEffect(() => {
    if (details === null) {
      setHasError(true);
      setErrorMessage("Tournament not found.");
      return;
    }
  }, [details]);

  // Handle Redirects when Match Status Changes
  useEffect(() => {
    if (!details?.match) return;

    if (details.match.status === "running") {
      router.replace(`/play/${matchId}?token=${details.match.play_token}`);
      return;
    }

    if (details.match.status === "cancelled") {
      toast.error("Tournament was cancelled (not enough players).");
      router.replace("/arena");
      return;
    }

    // Auto-boot if accessing lobby outside the 2-minute registration window
    if (details.match.status === "waiting" && details.match.scheduled_for) {
      if (now < details.match.scheduled_for || now > details.match.scheduled_for + 120000) {
        toast.error("Tournament lobby is currently closed.");
        router.replace("/arena");
      }
    }
  }, [details?.match, router, matchId, now]);

  // Auto-Start trigger when 2 minutes pass
  useEffect(() => {
    if (details?.match?.status === "waiting" && details.match.scheduled_for) {
      const startTime = details.match.scheduled_for + 120000;

      if (now >= startTime) {
        startMatch({ match_id: matchId as any }).catch(() => {});
      }

      if (now < startTime) {
        const msUntilStart = startTime - now;
        const timer = setTimeout(() => {
          startMatch({ match_id: matchId as any }).catch(() => {});
        }, msUntilStart);
        return () => clearTimeout(timer);
      }
    }
  }, [details?.match, startMatch, matchId, now]);

  if (hasError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
        <div className="bg-neutral-900 border border-red-500/30 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
            <ShieldAlert size={40} className="text-red-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-3">Access Denied</h2>
          <p className="text-neutral-400 mb-6">{errorMessage}</p>
          <button
            onClick={() => router.push("/arena")}
            className="px-6 py-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition"
          >
            Return to Arena
          </button>
        </div>
      </div>
    );
  }

  if (!details || isPending) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-pink-500" size={48} />
      </div>
    );
  }

  const { match, players } = details;

  // Find if current user is an organizer
  const isOrg = publicId
    ? match.organizer_ids?.includes(publicId as any) || false
    : false;

  // Calculate time remaining in the 2-minute window (real-time)
  const startTime = (match.scheduled_for || 0) + 120000;
  const timeRemainingMs = Math.max(0, startTime - now);
  const totalSeconds = Math.ceil(timeRemainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-12 relative flex items-center justify-center">
      <AnimatedBackground />

      <div className="max-w-4xl w-full relative z-10">
        <button
          onClick={() => router.push("/arena")}
          className="mb-4 flex items-center gap-2 text-neutral-400 hover:text-white transition text-sm font-bold"
        >
          <LogOut size={16} /> Exit Lobby
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Match Settings Info */}
          <div className="bg-neutral-900/80 border border-yellow-500/30 rounded-3xl p-8 backdrop-blur-xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center border border-yellow-500/20 mb-6 text-yellow-500">
              <Swords size={32} />
            </div>
            <h1 className="text-3xl font-black mb-2">{match.tournament_name}</h1>
            <p className="text-neutral-400 mb-6">
              {isOrg
                ? "You are an Organizer for this tournament."
                : "You are registered. Waiting for the match to begin."}
            </p>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-neutral-800">
                <span className="text-neutral-400 flex items-center gap-2">
                  <ShieldAlert size={18} /> Difficulty
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
            </div>

            <div className="mt-8">
              <div className="w-full py-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-center">
                <span className="text-yellow-500 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                  <Clock size={16} className="animate-pulse" /> TOURNAMENT STARTS IN
                </span>
                <span className="text-5xl font-black text-white font-mono drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                  {minutes}:{seconds.toString().padStart(2, "0")}
                </span>
                <div className="text-xs text-neutral-500 mt-2 font-bold uppercase tracking-wider">
                  {totalSeconds > 0 ? "Prepare yourself" : "Starting match..."}
                </div>
              </div>
            </div>
            
            {/* Progress bar */}
            {totalSeconds > 0 && (
              <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-6 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${Math.max(0, 100 - (timeRemainingMs / 120000) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Players List */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-8 backdrop-blur-xl flex flex-col">
            <h2 className="text-xl font-bold flex items-center gap-3 mb-6">
              <Users className="text-blue-400" />
              Contenders ({players.length}/{match.max_players || 100})
            </h2>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {players.map((p: any, i: number) => (
                <div
                  key={p._id}
                  className="flex items-center gap-4 bg-black/40 p-3 rounded-xl border border-neutral-800 hover:border-yellow-500/30 transition"
                >
                  <img
                    src={p.profile_picture || `https://api.dicebear.com/9.x/avataaars/svg?seed=${p.username}`}
                    alt={p.username}
                    className="w-10 h-10 rounded-full border border-neutral-700 bg-neutral-800"
                  />
                  <div>
                    <div className="font-bold text-white flex items-center gap-2 text-sm">
                      {p.username}
                      {p.user_id === match.host_id && (
                        <Crown size={12} className="text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Rating: {p.rating}
                    </div>
                  </div>
                </div>
              ))}
              {players.length === 0 && (
                <div className="text-center text-neutral-500 py-8 text-sm bg-black/20 rounded-xl border border-dashed border-neutral-800">
                  <Users size={24} className="mx-auto text-neutral-600 mb-2" />
                  No players have joined yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
