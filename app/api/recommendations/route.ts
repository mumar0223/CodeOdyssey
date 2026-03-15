import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { isColdStartUser, getColdStartRecommendations } from "@/lib/ml/coldStart";
import { generateRecommendations, ProblemStats } from "@/lib/ml/recommender";
import { UserFeatures } from "@/lib/ml/features";

// Edge/Serverless friendly Convex client
// Non-reactive pure fetch client using the public URL
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get("publicId");

    if (!publicId) {
      return NextResponse.json(
        { error: "Missing publicId parameter" },
        { status: 400 }
      );
    }

    // 1. Fetch user data and stats concurrently for speed (<50ms budget target)
    const [userProfile, rawTopicStats] = await Promise.all([
      convex.query(api.users.getUserProfile as any, { public_id: publicId }).catch(() => null),
      convex.query(api.topicStats.getUserTopicStatsByPublicId as any, { public_id: publicId }).catch(() => []),
    ]);

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Calculate metadata to detect overall progression 
    let totalAttempts = 0;
    const uniqueTopics = new Set<string>();
    const topicStatsMap = new Map<string, any>();

    // Safely parse topic stats if available
    const userTopicStats = Array.isArray(rawTopicStats) ? rawTopicStats : [];
    for (const stat of userTopicStats) {
      const attempts = stat.attempts || stat.total_attempts || 0;
      totalAttempts += attempts;
      if (attempts > 0) {
        uniqueTopics.add(stat.topic);
      }
      topicStatsMap.set(stat.topic, {
        successRate: stat.successRate || stat.success_rate || 50,
        attempts: attempts,
        avgTime: stat.avgTime || stat.avg_time || 0,
        avgDifficulty: stat.avgDifficulty || stat.avg_difficulty || 1500,
      });
    }

    // 3. Fetch candidate problems (e.g., getting a diverse pool of random questions)
    const candidates = await convex
      .query(api.questions.getRandomQuestions as any, { count: 50 })
      .catch(() => []);

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        coldStart: false,
        recommendations: [],
      });
    }

    // Check Cold Start Strategy
    if (isColdStartUser(totalAttempts, uniqueTopics.size)) {
      const csRecommendations = getColdStartRecommendations(candidates, 5);
      return NextResponse.json({
        coldStart: true,
        recommendations: csRecommendations,
      });
    }

    // 4. Fetch bandit stats for tracking exploration
    // Using trending problems or generic stats if isolated problem stats aren't exposed
    let rawProblemStats: any[] = [];
    try {
      rawProblemStats = await convex.query(api.problemStats.getTrendingProblems as any, {});
    } catch {
      // Fallback: silently handle missing endpoint
    }

    const banditStatsMap = new Map<string, ProblemStats>();
    let totalPlatformImpressions = 0;

    if (Array.isArray(rawProblemStats)) {
      for (const stat of rawProblemStats) {
        // Normalizing schema fields
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

    if (totalPlatformImpressions === 0) {
      totalPlatformImpressions = Math.max(1, candidates.length * 10);
    }

    // 5. Build user feature map using the extracted fields
    const userFeaturesParams: UserFeatures = {
      rating: userProfile.rating || 1500,
      solvedCount: userProfile.solved_count || userProfile.solvedCount || 0,
      topicStats: topicStatsMap,
    };

    // 6. Call recommender
    const recommendations = generateRecommendations(
      userFeaturesParams,
      candidates,
      banditStatsMap,
      totalPlatformImpressions,
      5 // Targeting top N
    );

    // 7. Return JSON
    return NextResponse.json({
      coldStart: false,
      recommendations,
    });
  } catch (error: any) {
    console.error("Recommender API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
