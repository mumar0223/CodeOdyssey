"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Code2,
  Lock,
  Unlock,
  PlayCircle,
  Sparkles,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Compass,
  Loader2,
  Brain,
  ArrowRight,
} from "lucide-react";
import { useEffect, useState } from "react";

interface FeaturedChallengesProps {
  userId?: string; // public_id
}

interface RecommendationData {
  recommended: Array<{
    problemId: string;
    title: string;
    topic: string;
    difficulty: string;
    solveProbability?: number;
    reason?: string;
  }>;
  dailyChallenge: any;
  trending: any[];
  weakTopics: Array<{ topic: string; successRate: number; attempts: number }>;
  isColdStart: boolean;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "text-green-400 bg-green-500/10 border-green-500/20",
  Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Hard: "text-red-400 bg-red-500/10 border-red-500/20",
  "Very Hard": "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

export function FeaturedChallenges({ userId }: FeaturedChallengesProps) {
  const [data, setData] = useState<RecommendationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("recommended");

  // Fallback: fetch random questions for non-logged-in users
  // @ts-ignore
  const fallbackQuestions = useQuery(api.questions.getRandomQuestions, { limit: 6 });

  // @ts-ignore - new modules, types regenerated after convex push
  const dailyChallenge = useQuery(api.dailyChallenge?.getDailyChallenge);
  // @ts-ignore
  const trendingProblems = useQuery(api.problemStats?.getTrendingProblems, { limit: 6 });

  // Fetch ML recommendations if user is logged in
  useEffect(() => {
    if (!userId) return;

    setIsLoading(true);
    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId: userId, limit: 6 }),
    })
      .then((res) => res.json())
      .then((result) => {
        if (!result.error) setData(result);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [userId]);

  const sections = [
    { id: "recommended", label: "Recommended", icon: Sparkles, color: "blue" },
    { id: "daily", label: "Daily Challenge", icon: Calendar, color: "amber" },
    { id: "trending", label: "Trending", icon: TrendingUp, color: "green" },
    { id: "weak", label: "Weak Topics", icon: AlertTriangle, color: "red" },
  ];

  const renderProblemCard = (
    problem: any,
    extra?: { probability?: number; reason?: string }
  ) => {
    const diffColor =
      DIFFICULTY_COLORS[problem.difficulty] || DIFFICULTY_COLORS["Medium"];

    return (
      <div
        key={problem._id || problem.problemId}
        className="group cursor-pointer bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 flex items-center justify-between"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 ${diffColor}`}
          >
            {problem.locked ? <Lock size={20} /> : <Unlock size={20} />}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors truncate">
              {problem.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-400">
                {problem.topic}
              </span>
              {extra?.probability !== undefined && (
                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  {Math.round(extra.probability * 100)}% match
                </span>
              )}
              {extra?.reason && (
                <span className="text-[10px] text-neutral-500">
                  {extra.reason}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`text-xs font-bold px-2 py-1 rounded border ${diffColor}`}
          >
            {problem.difficulty}
          </span>
          <PlayCircle
            className="text-neutral-500 group-hover:text-blue-400 transition-colors"
            size={24}
          />
        </div>
      </div>
    );
  };

  // Recommended section content
  const renderRecommended = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12 text-neutral-400">
          <Loader2 className="animate-spin mr-2" size={20} />
          <span>AI is analyzing your profile...</span>
        </div>
      );
    }

    const problems = data?.recommended || [];

    if (!userId) {
      // Not logged in — show fallback
      return (
        <div className="space-y-3">
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-4">
            <p className="text-sm text-blue-300 flex items-center gap-2">
              <Brain size={16} /> Log in to get AI-powered personalized
              recommendations.
            </p>
          </div>
          {(fallbackQuestions || []).map((q: any) => renderProblemCard(q))}
        </div>
      );
    }

    if (problems.length === 0) {
      return (
        <div className="text-center py-12 text-neutral-400 bg-white/5 rounded-2xl border border-white/10">
          <Sparkles size={32} className="mx-auto mb-3 text-neutral-600" />
          <p>Solve more problems to unlock personalized recommendations.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {data?.isColdStart && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 mb-2">
            <p className="text-sm text-amber-300 flex items-center gap-2">
              <Sparkles size={16} /> Getting to know you! These are based on
              your skill level. Solve more to unlock smarter recommendations.
            </p>
          </div>
        )}
        {problems.map((p: any) =>
          renderProblemCard(
            { ...p, _id: p.problemId },
            { probability: p.solveProbability, reason: p.reason }
          )
        )}
      </div>
    );
  };

  // Daily Challenge section
  const renderDailyChallenge = () => {
    const challenge = data?.dailyChallenge || dailyChallenge;

    if (!challenge) {
      return (
        <div className="text-center py-12 text-neutral-400 bg-white/5 rounded-2xl border border-white/10">
          <Calendar size={32} className="mx-auto mb-3 text-neutral-600" />
          <p>No daily challenge available yet.</p>
          <p className="text-xs mt-2 text-neutral-600">
            Check back tomorrow!
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center border border-amber-500/30 text-amber-400">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {challenge.title}
              </h3>
              <p className="text-xs text-amber-400/70">
                {challenge.challengeDate || new Date().toISOString().split("T")[0]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-neutral-400">{challenge.topic}</span>
            <span
              className={`text-xs font-bold px-2 py-1 rounded border ${DIFFICULTY_COLORS[challenge.difficulty] || ""}`}
            >
              {challenge.difficulty}
            </span>
          </div>
          <p className="text-sm text-neutral-300 mt-3 line-clamp-2">
            {challenge.description?.slice(0, 150)}...
          </p>
          <button className="mt-4 w-full py-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold rounded-xl transition border border-amber-500/30 flex items-center justify-center gap-2">
            Accept Challenge <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  // Trending section
  const renderTrending = () => {
    const problems = data?.trending || trendingProblems || [];

    if (problems.length === 0) {
      return (
        <div className="text-center py-12 text-neutral-400 bg-white/5 rounded-2xl border border-white/10">
          <TrendingUp size={32} className="mx-auto mb-3 text-neutral-600" />
          <p>No trending problems yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {problems.map((p: any, i: number) => (
          <div
            key={p._id || i}
            className="group cursor-pointer bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/10 hover:border-green-500/30 transition-all duration-300 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 font-black text-sm">
                #{i + 1}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">
                  {p.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-neutral-400">{p.topic}</span>
                  {p.popularity && (
                    <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                      {p.popularity.recent_solves_7d || 0} solves this week
                    </span>
                  )}
                </div>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2 py-1 rounded border ${DIFFICULTY_COLORS[p.difficulty] || ""}`}
            >
              {p.difficulty}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Weak Topics section
  const renderWeakTopics = () => {
    const weakTopics = data?.weakTopics || [];

    if (!userId) {
      return (
        <div className="text-center py-12 text-neutral-400 bg-white/5 rounded-2xl border border-white/10">
          <AlertTriangle size={32} className="mx-auto mb-3 text-neutral-600" />
          <p>Log in to see your weak topics.</p>
        </div>
      );
    }

    if (weakTopics.length === 0) {
      return (
        <div className="text-center py-12 bg-green-500/5 rounded-2xl border border-green-500/20">
          <span className="text-4xl mb-4 block">🎉</span>
          <p className="text-green-300 font-bold">
            No weak topics detected!
          </p>
          <p className="text-neutral-400 text-sm mt-1">
            You&apos;re performing well across all topics.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-2">
          <p className="text-sm text-red-300 flex items-center gap-2">
            <AlertTriangle size={16} /> These topics need more practice to
            improve your performance.
          </p>
        </div>
        {weakTopics.map((wt, i) => (
          <div
            key={i}
            className="bg-white/5 rounded-2xl p-5 border border-white/10 hover:border-red-500/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-white group-hover:text-red-400 transition-colors">
                {wt.topic}
              </h4>
              <span className="text-xs text-neutral-500">
                {wt.attempts} attempts
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${
                    wt.successRate < 30
                      ? "bg-red-500"
                      : wt.successRate < 50
                        ? "bg-orange-500"
                        : "bg-yellow-500"
                  }`}
                  style={{ width: `${wt.successRate}%` }}
                />
              </div>
              <span
                className={`text-sm font-mono font-bold ${
                  wt.successRate < 30
                    ? "text-red-400"
                    : wt.successRate < 50
                      ? "text-orange-400"
                      : "text-yellow-400"
                }`}
              >
                {wt.successRate}%
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mt-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-400">
      <div className="flex items-center gap-3 mb-6">
        <Code2 className="text-blue-400" size={28} />
        <h2 className="text-3xl font-black tracking-tight text-white drop-shadow-lg">
          Featured Challenges
        </h2>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-800">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${
                isActive
                  ? `bg-${section.color}-500/20 text-${section.color}-400 border-${section.color}-500/30`
                  : "bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
              style={
                isActive
                  ? {
                      backgroundColor: `var(--color-${section.color}-500, rgba(59,130,246,0.2))`,
                      borderColor: `var(--color-${section.color}-500, rgba(59,130,246,0.3))`,
                    }
                  : undefined
              }
            >
              <Icon size={16} />
              {section.label}
              {section.id === "weak" && data?.weakTopics && data.weakTopics.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-black">
                  {data.weakTopics.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      <div className="min-h-[200px]">
        {activeSection === "recommended" && renderRecommended()}
        {activeSection === "daily" && renderDailyChallenge()}
        {activeSection === "trending" && renderTrending()}
        {activeSection === "weak" && renderWeakTopics()}
      </div>
    </div>
  );
}
