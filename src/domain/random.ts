export type Rng = (maxExclusive: number) => number;

/** Uniform integer in [0, max) using the Web Crypto API. */
export const cryptoRng: Rng = (max) => {
  if (max <= 0) throw new Error('max must be > 0');
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
};

export function pick<T>(items: readonly T[], rng: Rng = cryptoRng): T {
  if (items.length === 0) throw new Error('Cannot pick from an empty list');
  return items[rng(items.length)];
}

export function shuffle<T>(items: readonly T[], rng: Rng = cryptoRng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function uid(): string {
  return crypto.randomUUID();
}
