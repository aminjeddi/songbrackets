export type Song = { title: string; playcount: number; seed: number };
export type Matchup = { a: Song; b: Song; round: number };

export function seedOrder(n: number): number[] {
  const rounds = Math.log2(n);
  let pls = [1, 2];
  for (let i = 1; i < rounds; i++) {
    const sum = pls.length * 2 + 1;
    const out: number[] = [];
    for (const p of pls) {
      out.push(p);
      out.push(sum - p);
    }
    pls = out;
  }
  return pls;
}

export function buildFirstRound(songs: Song[]): Matchup[] {
  const order = seedOrder(songs.length);
  const matchups: Matchup[] = [];
  for (let i = 0; i < order.length; i += 2) {
    matchups.push({
      a: songs[order[i] - 1],
      b: songs[order[i + 1] - 1],
      round: songs.length,
    });
  }
  return matchups;
}

export function roundName(sizeAtStart: number): string {
  switch (sizeAtStart) {
    case 64: return "R64";
    case 32: return "R32";
    case 16: return "Sweet 16";
    case 8: return "Elite 8";
    case 4: return "Semis";
    case 2: return "Final";
    default: return `R${sizeAtStart}`;
  }
}

export function totalMatchups(n: number): number {
  return n - 1;
}
