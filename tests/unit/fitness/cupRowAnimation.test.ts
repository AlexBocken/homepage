import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import Probe from './__fixtures__/CupRowProbe.svelte';

// CupRowProbe mirrors how the liquids card wires its cup row: counts derived per
// drink kind, an effect that diffs those runs to find what moved, and an
// index-keyed each. Keep it in step with the real page — its whole job is to
// catch what a pure test of cupRowChange cannot, namely the effect blowing up.

const hot = (ml: number) => ({ kind: 'hot' as const, ml });
const water = (ml: number) => ({ kind: 'water' as const, ml });

function positions(selector: string): number[] {
	return Array.from(document.querySelectorAll(selector))
		.map(el => Number((el as HTMLElement).dataset.testid!.replace('cup-', '')));
}

/** Row positions currently carrying the fill animation. */
const filling = () => positions('button.filling');
/** Row positions currently emptying. */
const draining = () => positions('button.draining');
/** How many cups the add-mug button sits after, by DOM order. */
function ghostSitsAfter(): number {
	const all = Array.from(document.querySelectorAll('button'));
	return all.findIndex(el => (el as HTMLElement).dataset.testid === 'ghost');
}

afterEach(() => { vi.useRealTimers(); });

describe('cup row fill animation', () => {
	// Two ways this has broken: the index math (a mug joins the front of the row
	// while the total grows at the back), and the effect storing its previous
	// snapshot in $state — deep-proxied on write, so the next read never matched
	// and it re-triggered itself into effect_update_depth_exceeded.
	it('animates the new mug, not the last glass in the row', async () => {
		const { rerender } = render(Probe, { entries: [hot(1000), water(1500)] });
		await tick();
		expect(filling()).toEqual([]);

		await rerender({ entries: [hot(1250), water(1500)] });
		await tick();
		// Four mugs already stood at 0-3, so the fifth is position 4 — not position
		// 9, where the last full glass sits.
		expect(filling()).toEqual([4]);
	});

	it('animates a new glass past every mug drawn before it', async () => {
		const { rerender } = render(Probe, { entries: [hot(1000), water(500)] });
		await tick();

		await rerender({ entries: [hot(1000), water(750)] });
		await tick();
		expect(filling()).toEqual([6]);
	});

	it('stays still when a day is swapped in under it', async () => {
		const { rerender } = render(Probe, { entries: [hot(1000), water(1500)] });
		await tick();

		await rerender({ entries: [hot(250), water(500)] });
		await tick();
		expect(filling()).toEqual([]);
	});

	// Removing a mug is the hard case: it is the first run, so the moment the entry
	// goes every cup behind it slides one place left. Without holding the layout,
	// the drain plays over whichever water glass inherited the spot and the add
	// button jumps away mid-animation.
	describe('removing a mug', () => {
		it('keeps the emptying cup, its shape and the add button in place', async () => {
			vi.useFakeTimers();
			const { rerender } = render(Probe, { entries: [hot(750), water(1500)] });
			await tick();
			expect(ghostSitsAfter()).toBe(3);

			await rerender({ entries: [hot(500), water(1500)] });
			await tick();

			// The third mug empties where it was pressed, still drawn as a mug.
			expect(draining()).toEqual([2]);
			expect(document.querySelector('[data-testid="cup-2"]')!.classList).toContain('hot');
			// And the add button has not yet slid left past it.
			expect(ghostSitsAfter()).toBe(3);
		});

		it('lets the row close up once the cup has drained', async () => {
			vi.useFakeTimers();
			const { rerender } = render(Probe, { entries: [hot(750), water(1500)] });
			await tick();
			await rerender({ entries: [hot(500), water(1500)] });
			await tick();

			await vi.advanceTimersByTimeAsync(700);
			await tick();

			expect(draining()).toEqual([]);
			expect(ghostSitsAfter()).toBe(2);
			expect(document.querySelector('[data-testid="cup-2"]')!.classList).not.toContain('hot');
		});
	});
});
