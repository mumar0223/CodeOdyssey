"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AlertTriangle, ArrowRight, Target } from "lucide-react";

interface WeakTopicBannerProps {
  userId?: string; // public_id, as a user internal ID
  userInternalId?: string; // Convex user _id
}

export function WeakTopicBanner({ userId }: WeakTopicBannerProps) {
  // @ts-ignore
  const weakTopics = useQuery(
    api.weakTopics?.getWeakTopicsByPublicId,
    userId ? { public_id: userId } : "skip"
  );

  // Don't show if not logged in or no weak topics
  if (!userId || !weakTopics || weakTopics.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mt-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-600">
      <div className="bg-gradient-to-r from-red-500/10 via-orange-500/5 to-transparent border border-red-500/20 rounded-3xl p-6 md:p-8">
        <div className="flex items-start gap-6">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <Target size={28} className="text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-black text-white mb-1">
              Improve Your Weak Topics
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              Focus on these areas to level up your skills. The AI will
              personalize challenges for you.
            </p>

            <div className="flex flex-wrap gap-3">
              {weakTopics.slice(0, 3).map((wt: any, i: number) => (
                <div
                  key={i}
                  className="group cursor-pointer bg-black/30 rounded-xl px-4 py-3 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center gap-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">
                      {wt.topic}
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${wt.success_rate}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-red-400">
                        {wt.success_rate}%
                      </span>
                    </div>
                  </div>
                  <ArrowRight
                    size={14}
                    className="text-neutral-600 group-hover:text-red-400 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
