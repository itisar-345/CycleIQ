/** Natural log of the gamma function (Lanczos approximation). */
const logGamma = (x: number): number => {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const coef of c) ser += coef / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
};

/** Continued fraction for the incomplete beta function (Numerical Recipes betacf). */
const betaContinuedFraction = (a: number, b: number, x: number): number => {
  const MAX_ITER = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
};

/** Regularized incomplete beta I_x(a, b). */
const regularizedIncompleteBeta = (x: number, a: number, b: number): number => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
};

/** Two-sided p-value for a Student t statistic with `df` degrees of freedom. */
export const studentTTwoSidedP = (t: number, df: number): number => {
  if (!Number.isFinite(t)) return 0;
  return regularizedIncompleteBeta(df / (df + t * t), df / 2, 0.5);
};

export function computeSpearman(x: number[], y: number[]): { correlation: number, pValue: number, n: number } {
  const n = x.length;
  if (n < 3) return { correlation: 0, pValue: 1, n };

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

  // Pearson correlation of the ranks — correct even with ties, unlike the 6Σd² shortcut.
  const meanRank = (n + 1) / 2;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = rankX[i] - meanRank;
    const dy = rankY[i] - meanRank;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return { correlation: 0, pValue: 1, n };
  const correlation = num / Math.sqrt(denX * denY);

  if (Math.abs(correlation) >= 1) return { correlation, pValue: 0, n };
  const t = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));
  return { correlation, pValue: studentTTwoSidedP(t, n - 2), n };
}

/**
 * Benjamini–Hochberg: returns, for each input p-value, whether it is significant
 * while controlling the false discovery rate at `q` across all tests run together.
 */
export function benjaminiHochberg(pValues: number[], q = 0.1): boolean[] {
  const m = pValues.length;
  const order = pValues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  let cutoffRank = -1;
  order.forEach(({ p }, rank) => {
    if (p <= ((rank + 1) / m) * q) cutoffRank = rank;
  });
  const significant = new Array<boolean>(m).fill(false);
  for (let rank = 0; rank <= cutoffRank; rank++) significant[order[rank].i] = true;
  return significant;
}
