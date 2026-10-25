/**
 * Seeded PRNG for the case-math drills. A question is fully determined by its
 * (skill, level, seed), so the client and the server generate the same one:
 * the client only reports the seed and what was typed, and the server grades it.
 */

export type Rng = () => number;

/** mulberry32: tiny, fast, good enough for picking numbers. */
export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A fresh 32-bit seed. */
export function newSeed(): number {
	return Math.floor(Math.random() * 4294967296) >>> 0;
}

/** Integer in [lo, hi], inclusive. */
export function int(rng: Rng, lo: number, hi: number): number {
	return lo + Math.floor(rng() * (hi - lo + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
	return items[Math.floor(rng() * items.length)];
}

/** Integer in [lo, hi] that is not a multiple of 10 (keeps "nice" tricks honest). */
export function intNotRound(rng: Rng, lo: number, hi: number): number {
	for (;;) {
		const n = int(rng, lo, hi);
		if (n % 10 !== 0) return n;
	}
}
