import { computeFeatures, UserFeatures, ProblemFeatures, getDifficultyRating } from "./features";
import { predictSolveProbability } from "./model";
import { banditScore } from "./bandit";

export interface RecommenderResult {
  problemId: string;
  title: string;
  topic: string;
  difficulty: string;
  probability: number;
  score: number;
}

export interface ProblemStats {
  problemId: string;
  impressions: number;
  successes: number;
}

/**
 * Main recommendation pipeline for predicting, targeting, and applying UCB exploration.
 */
export function generateRecommendations(
  userParams: UserFeatures,
  candidateProblems: any[],
  banditStatsMap: Map<string, ProblemStats>,
  totalPlatformImpressions: number,
  limit: number = 5
): RecommenderResult[] {
  const scoredProblems: RecommenderResult[] = [];

  for (const problem of candidateProblems) {
    // 1. Prepare problem features mapping
    const pFeatures: ProblemFeatures = {
      difficultyRating: getDifficultyRating(problem.difficulty),
      topic: problem.topic || "General",
      tags: problem.tags || [],
      solveRate: problem.solveRate || 50,
      popularity: problem.popularity || problem.total_attempts || 0,
    };

    // 2. Compute normalized feature vector
    const features = computeFeatures(userParams, pFeatures);

    // 3. Predict probability of solving using Logistic Regression
    const probability = predictSolveProbability(features);

    // 4. Learning zone targeting: 
    // We want P(solve) ≈ 0.65 - 0.75. A score of 0.70 is perfect (1.0).
    const learningScore = 1 - Math.abs(probability - 0.7);

    // 5. Bandit exploration (UCB)
    const stats = banditStatsMap.get(problem._id) || {
      problemId: problem._id,
      impressions: 0,
      successes: 0,
    };

    const finalScore = banditScore(
      learningScore, // Base score is the learning zone fit
      stats.impressions,
      totalPlatformImpressions
    );

    scoredProblems.push({
      problemId: problem._id,
      title: problem.title,
      topic: problem.topic || "General",
      difficulty: problem.difficulty || "Medium",
      probability,
      score: finalScore,
    });
  }

  // 6. Sort problems by their final UCB score descending
  scoredProblems.sort((a, b) => b.score - a.score);

  // 7. Topic diversity filtering (Max 2 per topic)
  const results: RecommenderResult[] = [];
  const topicCounts = new Map<string, number>();

  for (const item of scoredProblems) {
    if (results.length >= limit) break;

    const count = topicCounts.get(item.topic) || 0;
    if (count < 2) {
      results.push(item);
      topicCounts.set(item.topic, count + 1);
    }
  }

  // Fill up if diversity limits caused us to miss the 'limit' quota
  if (results.length < limit) {
    const remaining = scoredProblems.filter((p) => !results.includes(p));
    for (const p of remaining) {
      if (results.length >= limit) break;
      results.push(p);
    }
  }

  return results;
}
