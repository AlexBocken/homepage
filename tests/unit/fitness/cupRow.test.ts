import { describe, it, expect } from 'vitest';
import { cupRowChange } from '$lib/fitness/cupRow';

// Runs are [mugs, cold drinks, meal liquid, water], drawn in that order.
describe('cupRowChange', () => {
	// The bug: a tea joins the front of the row while the total grows at the back,
	// so animating by total lit up the last glass instead of the new mug.
	it('lights the new mug at the front, not the last cup in the row', () => {
		expect(cupRowChange([0, 0, 0, 6], [1, 0, 0, 6])).toEqual({
			kind: 'fill', run: 0, indices: [0],
		});
		expect(cupRowChange([3, 1, 1, 6], [4, 1, 1, 6])).toEqual({
			kind: 'fill', run: 0, indices: [3],
		});
	});

	it('offsets a new water cup past every run drawn before it', () => {
		expect(cupRowChange([4, 1, 2, 6], [4, 1, 2, 7])).toEqual({
			kind: 'fill', run: 3, indices: [13],
		});
	});

	it('names every cup when a run moves by more than one', () => {
		expect(cupRowChange([2, 0, 0, 0], [2, 0, 0, 3])).toEqual({
			kind: 'fill', run: 3, indices: [2, 3, 4],
		});
	});

	it('addresses the emptied cups by where they were drawn', () => {
		expect(cupRowChange([1, 0, 0, 4], [1, 0, 0, 2])).toEqual({
			kind: 'drain', run: 3, indices: [3, 4],
		});
		expect(cupRowChange([2, 1, 0, 3], [1, 1, 0, 3])).toEqual({
			kind: 'drain', run: 0, indices: [1],
		});
	});

	it('stays out of the way when nothing moved', () => {
		expect(cupRowChange([1, 2, 3, 4], [1, 2, 3, 4])).toBeNull();
	});

	// A date change swaps every run at once. Animating that would set the whole row
	// sloshing over a navigation nobody poured anything into.
	it('ignores a redraw that moves more than one run', () => {
		expect(cupRowChange([4, 1, 0, 6], [0, 0, 2, 3])).toBeNull();
		expect(cupRowChange([1, 0, 0, 0], [2, 1, 0, 0])).toBeNull();
	});
});
