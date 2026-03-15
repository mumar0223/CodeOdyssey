"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import {
  Lock,
  Unlock,
  PlayCircle,
  Layers,
  Code2,
} from "lucide-react";

const TOPICS = [
  "Overview",
  "Arrays",
  "Graphs",
  "Dynamic Programming",
  "Greedy",
  "Math",
  "Strings",
  "Trees",
  "Bit Manipulation",
  "Sorting",
  "Recursion",
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-green-400 bg-green-500/10 border-green-500/20",
  Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Hard: "text-red-400 bg-red-500/10 border-red-500/20",
  "Very Hard": "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export function TopicTabs() {
  const [activeTopic, setActiveTopic] = useState("Overview");

  // @ts-ignore
  const questions = useQuery(api.questions.getQuestionsByTopic, {
    topic: activeTopic === "Overview" ? undefined : activeTopic,
    limit: 10,
  });

  return (
    <div className="w-full max-w-7xl mt-16 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
      <div className="flex items-center gap-3 mb-6">
        <Layers className="text-purple-400" size={28} />
        <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">
          Topic Explorer
        </h2>
      </div>

      {/* Topic Tab Bar */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-thin scrollbar-thumb-neutral-800">
        {TOPICS.map((topic) => {
          const isActive = activeTopic === topic;
          return (
            <button
              key={topic}
              onClick={() => setActiveTopic(topic)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? "bg-purple-500/20 text-purple-300 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                  : "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              {topic}
            </button>
          );
        })}
      </div>

      {/* Problems Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {questions === undefined ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl bg-white/5 border border-white/10 animate-pulse"
            />
          ))
        ) : questions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-neutral-400 bg-white/5 rounded-2xl border border-white/10">
            <Code2 size={32} className="mx-auto mb-3 text-neutral-600" />
            <p className="font-bold mb-1">No {activeTopic} problems yet</p>
            <p className="text-sm text-neutral-500">
              Problems will appear here as you and others create them.
            </p>
          </div>
        ) : (
          questions.map((q: any) => {
            const diffColor =
              DIFFICULTY_COLORS[q.difficulty] || DIFFICULTY_COLORS["Medium"];
            return (
              <div
                key={q._id}
                className="group cursor-pointer bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 hover:border-purple-500/30 transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${diffColor}`}
                  >
                    {q.locked ? <Lock size={20} /> : <Unlock size={20} />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors truncate">
                      {q.title}
                    </h3>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-neutral-400">
                        {q.topic}
                      </span>
                      {q.tags?.slice(0, 2).map((tag: string, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded border ${diffColor}`}
                  >
                    {q.difficulty}
                  </span>
                  <PlayCircle
                    className="text-neutral-500 group-hover:text-purple-400 transition-colors"
                    size={24}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
