import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  generateRecommendations,
  type RecommenderResult,
} from "@/lib/ml/recommender";
import {
  isColdStartUser,
  getColdStartRecommendations,
} from "@/lib/ml/coldStart";
import type { UserFeatures } from "@/lib/ml/features";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { publicId, limit = 6 } = body;

    if (!publicId) {
      return NextResponse.json(
        { error: "publicId is required" },
        { status: 400 },
      );
    }

    // Fetch user data
    const userProfile = await convex.query(api.users.getUserProfile as any, {
      public_id: publicId,
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch topic stats
    const topicStats = await convex.query(
      api.topicStats.getUserTopicStatsByPublicId as any,
      { public_id: publicId },
    );

    // Fetch all questions for scoring
    const allQuestions = await convex.query(api.questions.getRandomQuestions as any, {
      limit: 50,
    });

    // Fetch trending problems
    const trending = await convex.query(api.problemStats.getTrendingProblems as any, {
    }).catch(() => []);

    // Fetch daily challenge
    const dailyChallenge = await convex.query(
      api.dailyChallenge.getDailyChallenge as any,
    ).catch(() => null);

    // Calculate total submissions and topic count
    const totalSubmissions = topicStats.reduce(
      (sum: number, ts: any) => sum + (ts.total_attempts || 0),
      0,
    );
    const uniqueTopics = topicStats.length;

    let recommended:
      | RecommenderResult[]
      | ReturnType<typeof getColdStartRecommendations> = [];

    if (isColdStartUser(totalSubmissions, uniqueTopics)) {
      // Cold start: use fallback strategies
      const problemsWithPopularity = allQuestions.map((q: any) => ({
        ...q,
        _id: q._id.toString(),
        popularity: undefined, // We don't have popularity join easily here
      }));

      recommended = getColdStartRecommendations(
        problemsWithPopularity,
        limit,
      );
    } else {
      // Build user features from topic stats
      const topicStatsMap = new Map<
        string,
        {
          successRate: number;
          attempts: number;
          avgTime: number;
          avgDifficulty: number;
        }
      >();

      for (const ts of topicStats) {
        topicStatsMap.set(ts.topic, {
          successRate: ts.success_rate || 50,
          attempts: ts.total_attempts || 0,
          avgTime: ts.avg_time || 0,
          avgDifficulty: ts.avg_difficulty || 1500,
        });
      }

      const userFeatures: UserFeatures = {
        rating: userProfile.rating || 1500,
        solvedCount: userProfile.solved_count || 0,
        topicStats: topicStatsMap,
      };

      const problemsForScoring = allQuestions.map((q: any) => ({
        ...q,
        _id: q._id.toString(),
        tags: q.tags || [],
        popularity: undefined,
      }));
      
      const banditStatsMap = new Map();
      let totalPlatformImpressions = 0;
      if (Array.isArray(trending)) {
        for (const stat of trending) {
          const impressions = stat.impressions || stat.total_attempts || 0;
          const successes = stat.successes || stat.total_solved || 0;
          banditStatsMap.set(stat.problemId || stat._id, {
            problemId: stat.problemId || stat._id,
            impressions,
            successes,
          });
          totalPlatformImpressions += impressions;
        }
      }
      if (totalPlatformImpressions === 0) totalPlatformImpressions = Math.max(1, allQuestions.length * 10);

      recommended = generateRecommendations(
        userFeatures,
        problemsForScoring,
        banditStatsMap,
        totalPlatformImpressions,
        limit,
      );
    }

    // Fetch weak topics
    const weakTopics = await convex.query(
      api.weakTopics.getWeakTopicsByPublicId,
      { public_id: publicId },
    );

    return NextResponse.json({
      recommended,
      dailyChallenge,
      trending: trending.map((t: any) => ({
        ...t,
        _id: t._id?.toString(),
      })),
      weakTopics: weakTopics.map((w: any) => ({
        topic: w.topic,
        successRate: w.success_rate,
        attempts: w.total_attempts,
      })),
      isColdStart: isColdStartUser(totalSubmissions, uniqueTopics),
    });
  } catch (error: any) {
    console.error("Recommendation API error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations", details: error.message },
      { status: 500 },
    );
  }
}
