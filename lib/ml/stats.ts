// TODO: Replace with actual DB connection when ready
// @ts-ignore — placeholder until user sets up their DB system
const db: any = null;

export async function getProblemStats(problemIds: string[]) {
  const stats = await db
    .collection("problem_stats")
    .find({ problemId: { $in: problemIds } })
    .toArray();

  const map = new Map();

  for (const s of stats) {
    map.set(s.problemId, s);
  }

  return map;
}

export async function updateBanditStats(problemId: string, solved: boolean) {
  await db.collection("problem_stats").updateOne(
    { problemId },
    {
      $inc: {
        impressions: 1,
        successes: solved ? 1 : 0,
      },
    },
    { upsert: true },
  );
}
