import { describe, it, expect } from 'vitest';
import { parseSubmission } from '$lib/server/caseMath';

const ok = { mode: 'daily', date: '2026-10-25', durationMs: 60_000, attempts: [{ skill: 'squares', level: 2, seed: 5, given: '625', ms: 3000 }] };

describe('parseSubmission', () => {
	it('accepts a well-formed session', () => {
		expect(parseSubmission(ok).attempts[0]).toEqual({ skill: 'squares', level: 2, seed: 5, given: '625', ms: 3000 });
	});

	it.each([
		['bad mode', { ...ok, mode: 'cheat' }],
		['bad date', { ...ok, date: '25.10.2026' }],
		['no attempts', { ...ok, attempts: [] }],
		['unknown skill', { ...ok, attempts: [{ ...ok.attempts[0], skill: 'nope' }] }],
		['level out of range', { ...ok, attempts: [{ ...ok.attempts[0], level: 6 }] }],
		['fractional seed', { ...ok, attempts: [{ ...ok.attempts[0], seed: 1.5 }] }],
		['negative time', { ...ok, attempts: [{ ...ok.attempts[0], ms: -1 }] }]
	])('rejects %s', (_, body) => {
		expect(() => parseSubmission(body)).toThrow();
	});

	it('clamps long answers and absurd timings', () => {
		const a = parseSubmission({ ...ok, attempts: [{ ...ok.attempts[0], given: 'x'.repeat(500), ms: 1e9 }] }).attempts[0];
		expect(a.given).toHaveLength(40);
		expect(a.ms).toBe(600_000);
	});
});
