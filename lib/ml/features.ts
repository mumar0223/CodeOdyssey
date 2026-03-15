/*
 * ML Feature Engineering for CodeOdyssey Recommendation System.
 * Computes feature vectors for user-problem pairs used by the scorer.
 */

// Difficulty string → numeric rating mapping
const DIFFICULTY_RATINGS: Record<string, number> = {
  Easy: 1000,
  Medium: 1500,
  Hard: 2000,
  "Very Hard": 2500,
};

export interface UserFeatures {
  rating: number;
  solvedCount: number;
  topicStats: Map<
    string,
    {
      successRate: number;
      attempts: number;
      avgTime: number;
      avgDifficulty: number;
    }
  >;
}

export interface ProblemFeatures {
  difficultyRating: number;
  topic: string;
  tags: string[];
  solveRate: number; // 0-100 from populariry
  popularity: number; // total attempts
}

export interface FeatureVector {
  // User-problem interaction features
  userRatingNorm: number; // normalized 0-1
  topicSuccessRate: number; // 0-1
  topicAttempts: number; // log-scaled
  difficultyGap: number; // normalized, negative = harder than avg
  globalSolveRate: number; // 0-1
  problemPopularity: number; // log-scaled
  topicFamiliarity: number; // 0-1 based on attempts in this topic
  ratingDifficultyMatch: number; // how well user rating matches problem difficulty
}

/**
 * Normalize a value to 0-1 range
 */
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Log-scale a count to reduce the impact of extreme values
 */
function logScale(count: number): number {
  return Math.log2(count + 1) / 10; // Keeps values roughly 0-1 for typical ranges
}

/**
 * Compute feature vector for a user-problem pair
 */
export function computeFeatures(
  user: UserFeatures,
  problem: ProblemFeatures,
): FeatureVector {
  const topicStat = user.topicStats.get(problem.topic);

  // User rating normalized (typical range 0-3000)
  const userRatingNorm = normalize(user.rating, 0, 3000);

  // Topic-specific success rate (0-1)
  const topicSuccessRate = topicStat ? topicStat.successRate / 100 : 0.5; // Default 50% for unknown topics

  // How many times user attempted this topic (log-scaled)
  const topicAttempts = topicStat ? logScale(topicStat.attempts) : 0;

  // Gap between problem difficulty and user's average difficulty for this topic
  const userAvgDiff = topicStat ? topicStat.avgDifficulty : user.rating;
  const difficultyGap = normalize(
    problem.difficultyRating - userAvgDiff,
    -1000,
    1000,
  );

  // Global solve rate of the problem
  const globalSolveRate = problem.solveRate / 100;

  // Problem popularity
  const problemPopularity = logScale(problem.popularity);

  // Topic familiarity: 1 if user has lots of experience, 0 if none
  const totalTopicAttempts = topicStat ? topicStat.attempts : 0;
  const topicFamiliarity = Math.min(1, totalTopicAttempts / 20); // Max out at 20 attempts

  // Rating-difficulty match: 1 if perfect match, lower otherwise
  const ratingDiff = Math.abs(user.rating - problem.difficultyRating);
  const ratingDifficultyMatch = Math.max(0, 1 - ratingDiff / 1000);

  return {
    userRatingNorm,
    topicSuccessRate,
    topicAttempts,
    difficultyGap,
    globalSolveRate,
    problemPopularity,
    topicFamiliarity,
    ratingDifficultyMatch,
  };
}

/**
 * Extract difficulty rating from a question
 */
export function getDifficultyRating(
  difficulty: string,
  explicitRating?: number,
): number {
  if (explicitRating && explicitRating > 0) return explicitRating;
  return DIFFICULTY_RATINGS[difficulty] || 1500;
}
