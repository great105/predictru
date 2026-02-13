/**
 * Client-side LMSR calculations for instant UI previews.
 * Backend is the source of truth; this provides fast estimates.
 */

function logsumexp(a: number, b: number): number {
  const max = Math.max(a, b);
  return max + Math.log(Math.exp(a - max) + Math.exp(b - max));
}

function cost(qYes: number, qNo: number, b: number): number {
  return b * logsumexp(qYes / b, qNo / b);
}

export function estimateShares(
  qYes: number,
  qNo: number,
  b: number,
  outcome: "yes" | "no",
  amount: number
): number {
  if (amount <= 0) return 0;

  let low = 0;
  let high = amount * 10;

  for (let i = 0; i < 50; i++) {
    const mid = (low + high) / 2;
    const costBefore = cost(qYes, qNo, b);
    const costAfter =
      outcome === "yes"
        ? cost(qYes + mid, qNo, b)
        : cost(qYes, qNo + mid, b);
    const tradeConst = costAfter - costBefore;

    if (tradeConst < amount) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}
