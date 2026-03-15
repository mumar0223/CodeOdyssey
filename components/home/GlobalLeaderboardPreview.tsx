import { useQuery } from "convex/react";
import { Trophy, Medal, Star } from "lucide-react";
// @ts-ignore
import { api } from "@/convex/_generated/api";
import Link from "next/link";

export function GlobalLeaderboardPreview() {
  // @ts-ignore
  const leaders = useQuery(api.leaderboard?.getGlobalLeaderboard || (() => []));

  return (
    <div className="w-full max-w-7xl mt-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
      <div className="flex items-center gap-3 mb-6">
        <Trophy className="text-yellow-400" size={28} />
        <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">
          Global Ranking
        </h2>
      </div>

      <div className="bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 text-neutral-400 font-medium w-16 text-center">Rank</th>
                <th className="p-4 text-neutral-400 font-medium">Player</th>
                <th className="p-4 text-neutral-400 font-medium">Rating</th>
                <th className="p-4 text-neutral-400 font-medium">Wins</th>
                <th className="p-4 text-neutral-400 font-medium text-right">Badge</th>
              </tr>
            </thead>
            <tbody>
              {leaders === undefined ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td colSpan={5} className="p-4">
                      <div className="h-6 rounded bg-white/5 animate-pulse w-full"></div>
                    </td>
                  </tr>
                ))
              ) : leaders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-neutral-500">
                    Leaderboard is empty. Play some matches!
                  </td>
                </tr>
              ) : (
                leaders.map((leader: any, idx: number) => (
                  <tr
                    key={leader._id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                  >
                    <td className="p-4 text-center">
                      {idx === 0 ? (
                        <Medal className="inline text-yellow-500" size={20} />
                      ) : idx === 1 ? (
                        <Medal className="inline text-gray-400" size={20} />
                      ) : idx === 2 ? (
                        <Medal className="inline text-amber-600" size={20} />
                      ) : (
                        <span className="text-neutral-500 font-mono">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-white group-hover:text-yellow-400 transition-colors">
                      <div className="flex items-center gap-2">
                        {leader.profile_picture ? (
                          <img src={leader.profile_picture} alt="" className="w-6 h-6 rounded-full" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                            {leader.username?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                        )}
                        <Link href={`/user/${leader.public_id}`} className="hover:underline transition">{leader.username}</Link>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-cyan-400">{leader.rating}</td>
                    <td className="p-4 text-neutral-300">{leader.wins}</td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-yellow-500/10 text-yellow-400 text-xs font-bold border border-yellow-500/20">
                        <Star size={12} fill="currentColor" /> {leader.userRank || 'Bronze I'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
