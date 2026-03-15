"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, Users, Search, Clock, Zap, Swords, Trophy, Shield } from "lucide-react";

interface OrganizerDashboardProps {
  matchId: string;
  publicId: string;
}

export function OrganizerDashboard({ matchId, publicId }: OrganizerDashboardProps) {
  const details = useQuery(api.matches.getMatchDetails, {
    match_id: matchId as any,
    public_id: publicId
  });

  if (!details) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={48} />
      </div>
    );
  }

  const { match, players } = details;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-3">
              <Shield size={32} className="text-purple-500" />
              Organizer Dashboard
            </h1>
            <p className="text-neutral-400 mt-2">Monitoring: {match.tournament_name}</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 px-6 py-3 rounded-xl flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-neutral-500 uppercase font-bold">Status</div>
              <div className={`font-black ${match.status === "running" ? "text-green-500" : "text-yellow-500"}`}>
                {match.status.toUpperCase()}
              </div>
            </div>
            <div className="w-px h-8 bg-neutral-800 mx-2" />
            <div className="text-center">
              <div className="text-xs text-neutral-500 uppercase font-bold">Players</div>
              <div className="font-black text-white">{players.length}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-pink-500" /> Competitor Activity
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-neutral-950 text-neutral-400 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4 font-bold">Player</th>
                    <th className="px-6 py-4 font-bold text-center">Score</th>
                    <th className="px-6 py-4 font-bold text-center">Questions Solved</th>
                    <th className="px-6 py-4 font-bold text-right">Time Used</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {players.map((p) => (
                    <tr key={p._id} className="hover:bg-neutral-800/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={p.profile_picture || `https://api.dicebear.com/9.x/avataaars/svg?seed=${p.username}`}
                            className="w-10 h-10 rounded-full border border-neutral-700 bg-neutral-800"
                            alt="Avatar"
                          />
                          <div>
                            <div className="font-bold">{p.username}</div>
                            <div className="text-xs text-neutral-500">Rating: {p.rating}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-green-400">
                        {p.score}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-neutral-800 text-neutral-300 px-3 py-1 rounded-full text-sm font-bold">
                          {p.solved_count} / {match.number_of_questions}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-neutral-400">
                        {Math.floor(p.total_time / 60)}m {p.total_time % 60}s
                      </td>
                    </tr>
                  ))}
                  {players.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-neutral-500">
                        No players registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-neutral-300">
              <Zap className="text-yellow-500" /> Match Details
            </h2>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
                <span className="text-neutral-500 text-sm">Mode</span>
                <span className="font-bold">{match.mode}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
                <span className="text-neutral-500 text-sm">Difficulty</span>
                <span className={`font-bold ${match.difficulty === "Hard" ? "text-red-400" : match.difficulty === "Medium" ? "text-yellow-400" : "text-green-400"}`}>
                  {match.difficulty}
                </span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
                <span className="text-neutral-500 text-sm">Prize Pool</span>
                <span className="font-bold text-yellow-500 flex items-center gap-1">
                  <Trophy size={14} /> {match.prize_pool || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 text-sm">Time Limit</span>
                <span className="font-bold flex items-center gap-1">
                  <Clock size={14} className="text-neutral-400" /> {match.time_limit ? match.time_limit / 60 : 0}m
                </span>
              </div>
            </div>

            <div className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-6">
              <h3 className="font-bold text-purple-400 mb-2">Organizer Tools</h3>
              <p className="text-sm text-neutral-400 mb-4">
                You have administrative access to this match. The tokens can be shared with other authorized organizers to help you monitor.
              </p>
              <div className="space-y-2">
                <div className="bg-black/50 p-2 rounded text-xs font-mono text-neutral-500 break-all border border-neutral-800">
                  <span className="text-purple-500 font-bold mb-1 block">Lobby Access:</span>
                  ?token={match.lobby_token}
                </div>
                <div className="bg-black/50 p-2 rounded text-xs font-mono text-neutral-500 break-all border border-neutral-800">
                  <span className="text-purple-500 font-bold mb-1 block">Play Access:</span>
                  ?token={match.play_token || "Pending..."}
                </div>
                <div className="bg-black/50 p-2 rounded text-xs font-mono text-neutral-500 break-all border border-neutral-800">
                  <span className="text-purple-500 font-bold mb-1 block">Invite Orgs:</span>
                  ?orgToken={match.organizer_invite_token}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
