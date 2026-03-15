/**
 * Cold Start Strategy for new users.
 * When a user lacks sufficient platform history, we fall back to a strategy
 * that prioritizes diverse, popular, medium-difficulty problems.
 */

const MIN_TOTAL_ATTEMPTS = 10;
const MIN_UNIQUE_TOPICS = 2;

/**
 * Determine if a user is in a cold start state.
 */
export function isColdStartUser(totalAttempts: number, uniqueTopics: number): boolean {
  return totalAttempts < MIN_TOTAL_ATTEMPTS || uniqueTopics < MIN_UNIQUE_TOPICS;
}

/**
 * Generates recommendations without relying on heavy ML personalization.
 * Targets popular, medium/easy problems across diverse topics.
 */
export function getColdStartRecommendations(
  candidateProblems: any[],
  count: number = 5
) {
  // 1. Filter to Medium and Easy difficulty
  const approachableProblems = candidateProblems.filter(
    (p) =>
      p.difficulty === "Medium" ||
      p.difficulty === "Easy" ||
      !p.difficulty
  );

  // 2. Sort by popularity descending (proxy for quality/engagement)
  const popularProblems = [...approachableProblems].sort((a, b) => {
    const popA = a.popularity || a.total_attempts || 0;
    const popB = b.popularity || b.total_attempts || 0;
    return popB - popA;
  });

  // 3. Ensure topic diversity (max 2 problems per topic)
  const results: any[] = [];
  const topicCounts = new Map<string, number>();

  for (const prob of popularProblems) {
    if (results.length >= count) break;

    const topic = prob.topic || "General";
    const tCount = topicCounts.get(topic) || 0;
    if (tCount < 2) {
      results.push(prob);
      topicCounts.set(topic, tCount + 1);
    }
  }

  // 4. Fill remaining slots if necessary, relaxing the topic constraint
  if (results.length < count) {
    const remaining = popularProblems.filter((p) => !results.includes(p));
    for (const prob of remaining) {
      if (results.length >= count) break;
      results.push(prob);
    }
  }

  // Map to the expected output format
  return results.map((p) => ({
    problemId: p._id,
    title: p.title,
    topic: p.topic || "General",
    difficulty: p.difficulty || "Medium",
    probability: 0.5, // Neutral probability estimate
    score: 1.0, // Arbitrary boost score for cold start selection
  }));
}
