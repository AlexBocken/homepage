import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { clampToViewport } from '../../../src/lib/js/clampToViewport';

/**
 * jsdom lays nothing out — every getBoundingClientRect is a zero rect — so the
 * panel's geometry is stated directly. That is the whole input to the function
 * anyway: what it does with a measured rect is the part worth pinning.
 */

const VW = 390; // iPhone-ish
const VH = 800;

// jsdom ships no ResizeObserver. Every browser the site targets has had one since
// 2020, so this is a gap in the test environment rather than one worth guarding
// for in the source; the stub records the callback so a resize can be simulated.
let notifyResize: (() => void) | null = null;
class StubResizeObserver {
	constructor(private cb: () => void) {}
	observe() {
		notifyResize = this.cb;
	}
	disconnect() {
		notifyResize = null;
	}
}
vi.stubGlobal('ResizeObserver', StubResizeObserver);

/** Run whatever the placement scheduled for the next frame. */
function flushFrames() {
	vi.advanceTimersByTime(32);
}

function viewport(w = VW, h = VH) {
	Object.defineProperty(document.documentElement, 'clientWidth', { value: w, configurable: true });
	Object.defineProperty(document.documentElement, 'clientHeight', { value: h, configurable: true });
}

/**
 * A panel that reports `rect`, and whose reported width shrinks to any max-width
 * set on it — the way a real wrapping panel behaves, and what the "cap it, then
 * re-measure" step depends on.
 */
function panel(rect: { left: number; width: number; top?: number; height?: number }) {
	const node = document.createElement('div');
	document.body.appendChild(node);
	node.getBoundingClientRect = () => {
		const cap = parseFloat(node.style.maxWidth) || Infinity;
		const width = Math.min(rect.width, cap);
		const capH = parseFloat(node.style.maxHeight) || Infinity;
		const height = Math.min(rect.height ?? 100, capH);
		// The measured position already includes whatever shift is in place, as a
		// real one would.
		const [tx, ty] = (node.style.translate || '0px 0px')
			.split(' ')
			.map((v) => parseFloat(v) || 0);
		const left = rect.left + tx;
		const top = (rect.top ?? 100) + (ty || 0);
		return { left, right: left + width, width, top, bottom: top + height, height } as DOMRect;
	};
	return node;
}

beforeEach(() => {
	viewport();
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
	document.body.innerHTML = '';
	notifyResize = null;
	vi.restoreAllMocks();
});

describe('clampToViewport', () => {
	it('pulls a panel hanging off the right edge back on screen', () => {
		// The reported bug: a 280px panel anchored to a trigger 250px in.
		const node = panel({ left: 250, width: 280 });
		clampToViewport(node);
		expect(node.style.translate).toBe('-148px 0px'); // 390 - 8 - 530
		const r = node.getBoundingClientRect();
		expect(r.right).toBeLessThanOrEqual(VW - 8);
	});

	it('pushes a panel hanging off the left edge back on screen', () => {
		const node = panel({ left: -40, width: 200 });
		clampToViewport(node);
		expect(node.style.translate).toBe('48px 0px');
		expect(node.getBoundingClientRect().left).toBe(8);
	});

	it('leaves a panel that already fits alone', () => {
		const node = panel({ left: 40, width: 200 });
		clampToViewport(node);
		expect(node.style.translate).toBe('');
	});

	it('caps a panel wider than the screen instead of only shifting it', () => {
		// No offset can rescue this one — a nowrap tooltip on a phone.
		const node = panel({ left: 20, width: 900 });
		clampToViewport(node);
		expect(node.style.maxWidth).toBe(`${VW - 16}px`);
		const r = node.getBoundingClientRect();
		expect(r.left).toBeGreaterThanOrEqual(8);
		expect(r.right).toBeLessThanOrEqual(VW - 8);
	});

	it('lifts a panel that runs off the bottom', () => {
		const node = panel({ left: 40, width: 200, top: 700, height: 200 });
		clampToViewport(node);
		expect(node.getBoundingClientRect().bottom).toBeLessThanOrEqual(VH - 8);
	});

	it('makes a panel taller than the screen scroll rather than overhang', () => {
		const node = panel({ left: 40, width: 200, top: 300, height: 1200 });
		clampToViewport(node);
		expect(node.style.maxHeight).toBe(`${VH - 16}px`);
		expect(node.style.overflowY).toBe('auto');
		expect(node.getBoundingClientRect().bottom).toBeLessThanOrEqual(VH - 8);
	});

	// Measuring an already-shifted panel and shifting again would walk it across
	// the screen one resize at a time.
	it('is idempotent across repeated placements', () => {
		const node = panel({ left: 250, width: 280 });
		clampToViewport(node);
		const once = node.style.translate;
		window.dispatchEvent(new Event('resize'));
		flushFrames();
		window.dispatchEvent(new Event('resize'));
		flushFrames();
		expect(node.style.translate).toBe(once);
	});

	it('re-places when the panel is revealed after being measured empty', () => {
		// A popover hidden with `display: none` measures as a zero box on mount —
		// the case an {#if} never produces but a CSS-only disclosure always does.
		let shown = false;
		const node = document.createElement('div');
		document.body.appendChild(node);
		node.getBoundingClientRect = () =>
			(shown
				? { left: 250, right: 530, width: 280, top: 100, bottom: 200, height: 100 }
				: { left: 0, right: 0, width: 0, top: 0, bottom: 0, height: 0 }) as DOMRect;

		clampToViewport(node);
		expect(node.style.translate).toBe('');

		shown = true;
		notifyResize?.();
		flushFrames();
		expect(node.style.translate).toBe('-148px 0px');
	});

	it('does nothing to a panel that is not rendered', () => {
		const node = document.createElement('div');
		node.getBoundingClientRect = () =>
			({ left: 0, right: 0, width: 0, top: 0, bottom: 0, height: 0 }) as DOMRect;
		clampToViewport(node);
		expect(node.style.translate).toBe('');
		expect(node.style.maxWidth).toBe('');
	});

	it('stops listening once detached', () => {
		const remove = vi.spyOn(window, 'removeEventListener');
		const node = panel({ left: 250, width: 280 });
		clampToViewport(node)();
		expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
		expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function), true);
	});
});
