export function getRankTier(rating: number): string {
  if (rating < 200) return "Bronze III";
  if (rating < 400) return "Bronze II";
  if (rating < 600) return "Bronze I";
  if (rating < 800) return "Silver III";
  if (rating < 1000) return "Silver II";
  if (rating < 1200) return "Silver I";
  if (rating < 1400) return "Gold III";
  if (rating < 1600) return "Gold II";
  if (rating < 1800) return "Gold I";
  if (rating < 2100) return "Platinum";
  if (rating < 2500) return "Diamond";
  if (rating < 2900) return "Master";
  return "Grandmaster";
}

export function calculateMultiplayerElo(players: {id: string, rating: number, score: number}[]) {
  // Use a dynamic K-factor based on player count or just 32. We will divide out by (N-1) to normalize 
  // so a 20 player match doesn't give 19x the rating change.
  const N = players.length;
  if (N <= 1) {
    const changes: Record<string, number> = {};
    players.forEach(p => changes[p.id] = 0);
    return changes;
  }

  const K = 32; 
  // Adjust K so that max gain/loss per match is roughly bounded 
  // Usually in multiplayer Elo, K is scaled down
  const scaledK = K / Math.max(1, (N - 1) / 2);

  const ratingChanges: Record<string, number> = {};
  for (const p of players) ratingChanges[p.id] = 0;

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const p1 = players[i];
      const p2 = players[j];
      
      const expected1 = 1 / (1 + Math.pow(10, (p2.rating - p1.rating) / 400));
      const expected2 = 1 / (1 + Math.pow(10, (p1.rating - p2.rating) / 400));
      
      let actual1 = 0;
      let actual2 = 0;
      
      if (p1.score > p2.score) {
        actual1 = 1; actual2 = 0;
      } else if (p1.score < p2.score) {
        actual1 = 0; actual2 = 1;
      } else {
        actual1 = 0.5; actual2 = 0.5; // Tie
      }
      
      ratingChanges[p1.id] += scaledK * (actual1 - expected1);
      ratingChanges[p2.id] += scaledK * (actual2 - expected2);
    }
  }
  
  // Round to nearest integer
  for (const p of players) {
    ratingChanges[p.id] = Math.round(ratingChanges[p.id]);
  }
  
  return ratingChanges;
}
