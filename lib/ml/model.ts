import { FeatureVector } from "./features";

/**
 * Weights for the Logistic Regression model.
 * These are manually tuned coefficients but in a real ML system
 * they would be learned from historical data.
 */
const MODEL_WEIGHTS = {
  userRatingNorm: 0.5,
  topicSuccessRate: 1.2,
  topicAttempts: 0.3,
  difficultyGap: 1.5, // Strongest predictor: problem diff vs user skill
  globalSolveRate: 0.8,
  problemPopularity: 0.2,
  topicFamiliarity: 0.4,
  ratingDifficultyMatch: 1.0,
};

// Bias term
const MODEL_BIAS = -0.5;

/**
 * Sigmoid activation function
 * Maps any real value to a probability between 0 and 1
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Predicts the probability that a user will solve a problem.
 * Implements logistic regression: P(solve) = sigmoid(w^T * x + b)
 */
export function predictSolveProbability(features: FeatureVector): number {
  const logit =
    features.userRatingNorm * MODEL_WEIGHTS.userRatingNorm +
    features.topicSuccessRate * MODEL_WEIGHTS.topicSuccessRate +
    features.topicAttempts * MODEL_WEIGHTS.topicAttempts +
    features.difficultyGap * MODEL_WEIGHTS.difficultyGap +
    features.globalSolveRate * MODEL_WEIGHTS.globalSolveRate +
    features.problemPopularity * MODEL_WEIGHTS.problemPopularity +
    features.topicFamiliarity * MODEL_WEIGHTS.topicFamiliarity +
    features.ratingDifficultyMatch * MODEL_WEIGHTS.ratingDifficultyMatch +
    MODEL_BIAS;

  return sigmoid(logit);
}
