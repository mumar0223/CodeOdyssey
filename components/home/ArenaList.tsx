import { useQuery } from "convex/react";
import { Users, Swords, Clock, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
// ts-ignore to bypass if _generated isn't built yet locally
// @ts-ignore
import { api } from "@/convex/_generated/api";

export function ArenaList() {
  const router = useRouter();
  const { data: sessionData, isPending } = useSession();
  // @ts-ignore
  const openArenas = useQuery(api.matches?.getOpenArenas || (() => []));

  const handleProtectedAction = (action: () => void) => {
    if (isPending) return;
    if (!sessionData?.user) {
      router.push("/login");
    } else {
      action();
    }
  };

  return (
    <div className="w-full max-w-7xl mt-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-lg flex items-center gap-3">
          <Swords className="text-pink-500" size={28} />
          Active Arenas
        </h2>
        <button
          onClick={() => handleProtectedAction(() => router.push("/arena"))}
          className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-bold rounded-full shadow-[0_0_20px_rgba(236,72,153,0.5)] hover:shadow-[0_0_40px_rgba(236,72,153,0.8)] transition-all transform hover:scale-105 flex items-center gap-2"
        >
          <Zap size={18} /> Join Random Arena
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {openArenas === undefined ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
            ></div>
          ))
        ) : openArenas.length === 0 ? (
          <div className="col-span-full py-12 text-center text-neutral-400 bg-white/5 rounded-2xl border border-white/10">
            No active arenas right now. Create one to challenge others!
          </div>
        ) : (
          openArenas.map((arena: any) => (
            <div
              key={arena._id}
              className="group relative bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-pink-500/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-pink-400 transition-colors">
                    {arena.difficulty} Arena
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-xs font-mono text-neutral-400 bg-white/10 px-2 py-1 rounded">
                      {arena.mode}
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-400">
                  <Swords size={20} />
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-neutral-300 mb-6">
                <div className="flex items-center gap-1.5">
                  <Users size={16} className="text-neutral-500" />
                  <span>2/{20} Players</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} className="text-neutral-500" />
                  <span>{arena.time_limit}s</span>
                </div>
              </div>

              <button
                onClick={() =>
                  handleProtectedAction(() =>
                    router.push(`/match/${arena._id}`),
                  )
                }
                className="w-full py-2.5 bg-white/10 hover:bg-pink-500/20 text-white hover:text-pink-400 font-bold rounded-xl transition-all border border-transparent hover:border-pink-500/50 flex items-center justify-center gap-2"
              >
                Join Arena
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
