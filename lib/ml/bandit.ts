/**
 * Multi-Armed Bandit Implementation using Upper Confidence Bound (UCB).
 * Balances exploitation (choosing problems we know are good for learning)
 * with exploration (testing problems we don't know much about).
 */

const DEFAULT_EXPLORATION_CONSTANT = 0.5; // 'c' in the UCB formula

/**
 * Calculates the bandit score using UCB algorithm:
 * score_i = p_i + c * sqrt(ln(N) / n_i)
 *
 * @param probability Predicted solve probability (or learning zone target score)
 * @param impressions Number of times THIS problem has been recommended
 * @param totalImpressions Total number of recommendations across ALL problems
 * @param c Exploration constant
 * @returns UCB score
 */
export function banditScore(
  probability: number,
  impressions: number,
  totalImpressions: number,
  c: number = DEFAULT_EXPLORATION_CONSTANT
): number {
  // If the problem has never been shown, force exploration by boosting its score.
  if (impressions === 0) {
    return probability + c * Math.sqrt(Math.log(Math.max(2, totalImpressions)) / 0.1); 
  }

  // Safe guard against ln(0) or ln(1) resulting in 0
  const safeTotal = Math.max(2, totalImpressions);

  // UCB exploration term
  const explorationTerm = c * Math.sqrt(Math.log(safeTotal) / impressions);

  return probability + explorationTerm;
}
