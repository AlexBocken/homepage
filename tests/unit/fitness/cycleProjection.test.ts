import { describe, it, expect } from 'vitest';
import { projectCycles, type PeriodInput } from '$lib/js/cycleProjection';

// Unit tests for the period analysis. projectCycles is the pure core behind the
// PeriodTracker's cycle/period averages, variability, last-cycle stats and
// predictions. Expected values below are computed by hand from the inputs.

const period = (start: string, end: string | null): PeriodInput => ({
	startDate: new Date(start),
	endDate: end ? new Date(end) : null
});

const DAY = 86_400_000;
const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / DAY);

describe('projectCycles — averages & variability', () => {
	// cycle gaps [28,30,27,29,26] → mean 28, sample-SD 1.58→1.6
	// period durs [5,4,6,5,4,6]  → mean 5,  sample-SD 0.89→0.9
	const varied = [
		period('2026-01-21', '2026-01-25'),
		period('2026-02-18', '2026-02-21'),
		period('2026-03-20', '2026-03-25'),
		period('2026-04-16', '2026-04-20'),
		period('2026-05-15', '2026-05-18'),
		period('2026-06-10', '2026-06-15')
	];

	it('computes mean cycle & period length', () => {
		const p = projectCycles(varied);
		expect(p.avgCycle).toBe(28);
		expect(p.avgPeriod).toBe(5);
	});

	it('computes sample standard deviation (rounded to 0.1)', () => {
		const p = projectCycles(varied);
		expect(p.cycleSd).toBe(1.6);
		expect(p.periodSd).toBe(0.9);
	});

	it('reports the most recent completed cycle & period length', () => {
		const p = projectCycles(varied);
		expect(p.lastCycleLength).toBe(26);
		expect(p.lastPeriodLength).toBe(6);
	});

	it('varied period lengths only: mean & SD reflect the spread', () => {
		// durs [3,7,5] → mean 5, sample-SD sqrt(((-2)^2+2^2+0)/2)=2.0; equal 28-day cycles → cycleSd 0
		const p = projectCycles([
			period('2026-04-01', '2026-04-03'),
			period('2026-04-29', '2026-05-05'),
			period('2026-05-27', '2026-05-31')
		]);
		expect(p.avgPeriod).toBe(5);
		expect(p.periodSd).toBe(2);
		expect(p.avgCycle).toBe(28);
		expect(p.cycleSd).toBe(0);
	});

	it('identical cycles have zero variability', () => {
		const p = projectCycles([
			period('2026-04-01', '2026-04-05'),
			period('2026-04-29', '2026-05-03'),
			period('2026-05-27', '2026-05-31')
		]);
		expect(p.avgCycle).toBe(28);
		expect(p.cycleSd).toBe(0);
		expect(p.periodSd).toBe(0);
	});
});

describe('projectCycles — sparse data falls back to priors', () => {
	it('a single period uses prior cycle length and no SD', () => {
		const p = projectCycles([period('2026-06-01', '2026-06-05')]);
		expect(p.avgCycle).toBe(29); // PRIOR_CYCLE
		expect(p.avgPeriod).toBe(5); // this period's duration
		expect(p.cycleSd).toBe(0);
		expect(p.periodSd).toBe(0);
		expect(p.lastCycleLength).toBeNull();
		expect(p.lastPeriodLength).toBe(5);
	});

	it('no periods uses both priors', () => {
		const p = projectCycles([]);
		expect(p.avgCycle).toBe(29);
		expect(p.avgPeriod).toBe(5);
		expect(p.futureCycles).toEqual([]);
	});
});

describe('projectCycles — predictions', () => {
	const varied = [
		period('2026-04-16', '2026-04-20'),
		period('2026-05-15', '2026-05-18'), // cycle 29
		period('2026-06-10', '2026-06-15') // cycle 26
	];

	it('predicts the next cycle ~avgCycle days after the last start', () => {
		const p = projectCycles(varied);
		expect(p.futureCycles.length).toBeGreaterThan(0);
		const next = p.futureCycles[0].start;
		// mean of [29,26] = 27.5 → round 28 (Math.round for the day step)
		expect(daysBetween(next, new Date('2026-06-10'))).toBe(Math.round(p.avgCycle));
	});

	it('places ovulation 14 days (luteal length) before the predicted period', () => {
		const p = projectCycles(varied);
		const c = p.futureCycles[0];
		expect(daysBetween(c.start, c.ovulation)).toBe(14);
		// fertile window ends no later than ovulation-ish and starts before it
		expect(c.fertileStart.getTime()).toBeLessThan(c.ovulation.getTime());
	});

	it('predicts the end of an ongoing period from the average period length', () => {
		const withOngoing = [...varied, period('2026-07-08', null)];
		const p = projectCycles(withOngoing);
		expect(p.predictedEndOfOngoing).not.toBeNull();
		// start + (round(avgPeriod) - 1) days
		expect(daysBetween(p.predictedEndOfOngoing!, new Date('2026-07-08'))).toBe(Math.round(p.avgPeriod) - 1);
	});
});
