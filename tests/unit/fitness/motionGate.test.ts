import { describe, it, expect } from 'vitest';
import { gateLogits, softmax, MotionGate, type GateWeights } from '$lib/js/motionGate';
import fixture from './motion-gate-fixture.json';

// The fixture is produced by scripts/motion-gate/train.py --fixture: a seeded
// model plus (input, logits) pairs computed by PyTorch. These tests lock the
// hand-rolled TS forward pass (motionGate.ts) to that computation — if they
// drift, the shipped in-browser model would score differently than it trained.

const weights = fixture as unknown as GateWeights;

describe('gateLogits — parity with PyTorch fixture', () => {
	it('has parity samples to check', () => {
		expect(weights.samples && weights.samples.length).toBeGreaterThan(0);
	});

	for (const [i, sample] of (weights.samples ?? []).entries()) {
		it(`reproduces PyTorch logits for sample ${i}`, () => {
			const flat = Float32Array.from(sample.x.flat());
			const got = gateLogits(weights, flat);
			expect(got.length).toBe(sample.logits.length);
			for (let c = 0; c < sample.logits.length; c++) {
				expect(got[c]).toBeCloseTo(sample.logits[c], 3);
			}
		});
	}
});

describe('softmax', () => {
	it('sums to 1 and is monotonic in the logits', () => {
		const p = softmax([1, 2, 3]);
		expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
		expect(p[2]).toBeGreaterThan(p[1]);
		expect(p[1]).toBeGreaterThan(p[0]);
	});
});

describe('MotionGate — disabled when no model', () => {
	it('always allows counting (never vetoes) with a null model', () => {
		const gate = new MotionGate(null);
		expect(gate.enabled).toBe(false);
		gate.push(undefined, 0);
		gate.push(undefined, 1000);
		expect(gate.repMotionOk).toBe(true);
		expect(gate.verdict).toBeNull();
	});
});
