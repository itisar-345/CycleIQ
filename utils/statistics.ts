export function computeSpearman(x: number[], y: number[]): { correlation: number, pValue: number, n: number } {
  const n = x.length;
  if (n < 2) return { correlation: 0, pValue: 1, n };

  const getRanks = (arr: number[]) => {
    const sorted = arr.map((val, i) => ({ val, index: i })).sort((a, b) => a.val - b.val);
    const ranks = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n && Math.abs(sorted[j].val - sorted[i].val) < 0.0001) j++;
      const rank = (i + j + 1) / 2;
      for (let k = i; k < j; k++) {
        ranks[sorted[k].index] = rank;
      }
      i = j;
    }
    return ranks;
  };

  const rankX = getRanks(x);
  const rankY = getRanks(y);

  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = rankX[i] - rankY[i];
    sumD2 += d * d;
  }

  const correlation = 1 - (6 * sumD2) / (n * (n * n - 1));
  let pValue = 1;
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));

  if (!isNaN(t) && Math.abs(correlation) !== 1) {
    pValue = Math.abs(t) > 2 ? 0.04 : 0.5; // Roughly significant at n>=20 if |t|>2
  } else if (Math.abs(correlation) === 1) {
    pValue = 0;
  }

  return { correlation, pValue, n };
}
