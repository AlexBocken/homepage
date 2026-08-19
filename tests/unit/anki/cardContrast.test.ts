/**
 * The colour decisions behind the card-contrast repair in static/other/anki.js.
 *
 * That file is a plain script served straight from static/ — it is never bundled,
 * so there is nothing to import. The test evaluates it the way the browser does
 * and reaches the pure helpers through the handle it exposes.
 *
 * What is worth testing here is the judgement, not the DOM walk: which colours
 * count as being on the wrong side of the theme, when text is unreadable, and
 * what the repair turns it into.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

type RGB = { r: number; g: number; b: number; a: number };

interface Helpers {
	parseColor(value: string): RGB | null;
	toCss(c: RGB): string;
	luminance(c: RGB): number;
	lstar(c: RGB): number;
	contrast(a: RGB, b: RGB): number;
	flipLightness(c: RGB): RGB;
	isWrongSide(c: RGB | null, night: boolean): boolean;
	minContrastFor(px: number, weight: number): number;
	repairTextColor(fg: RGB, bg: RGB, threshold: number, tokenFg: RGB | null): RGB | null;
}

let t: Helpers;

const rgb = (r: number, g: number, b: number, a = 1): RGB => ({ r, g, b, a });
const WHITE = rgb(255, 255, 255);
const BLACK = rgb(0, 0, 0);
const MID_GREY = rgb(128, 128, 128);

beforeAll(() => {
	const src = readFileSync(resolve(__dirname, '../../../static/other/anki.js'), 'utf8');
	// matchMedia is not in jsdom, and the script guards on it; localStorage is.
	new Function(src).call(window);
	t = (window as unknown as { __bockenAnkiTheme: Helpers }).__bockenAnkiTheme;
});

describe('parsing what getComputedStyle hands back', () => {
	it('reads rgb and rgba', () => {
		expect(t.parseColor('rgb(255, 0, 0)')).toEqual(rgb(255, 0, 0));
		expect(t.parseColor('rgba(0, 0, 0, 0)')).toEqual(rgb(0, 0, 0, 0));
	});

	it('gives up on anything else rather than guessing', () => {
		expect(t.parseColor('transparent')).toBeNull();
		expect(t.parseColor('')).toBeNull();
	});
});

describe('which side of the theme a colour is on', () => {
	it('uses perceptual lightness, not luminance', () => {
		// The reason the two measures are not interchangeable: mid grey sits near the
		// middle of L* but nowhere near the middle of luminance.
		expect(t.luminance(MID_GREY)).toBeCloseTo(0.216, 2);
		expect(t.lstar(MID_GREY)).toBeCloseTo(53.6, 1);
	});

	it('calls out a white card in the dark theme', () => {
		expect(t.isWrongSide(WHITE, true)).toBe(true);
		expect(t.isWrongSide(WHITE, false)).toBe(false);
	});

	it('calls out a black card in the light theme', () => {
		expect(t.isWrongSide(rgb(30, 30, 30), false)).toBe(true);
		expect(t.isWrongSide(rgb(30, 30, 30), true)).toBe(false);
	});

	it('leaves mid greys alone in both themes', () => {
		expect(t.isWrongSide(MID_GREY, true)).toBe(false);
		expect(t.isWrongSide(MID_GREY, false)).toBe(false);
	});

	it('ignores a see-through background, because what is behind it decides', () => {
		expect(t.isWrongSide(rgb(255, 255, 255, 0), true)).toBe(false);
	});
});

describe('contrast', () => {
	it('matches the WCAG extremes', () => {
		expect(t.contrast(BLACK, WHITE)).toBeCloseTo(21, 5);
		expect(t.contrast(WHITE, WHITE)).toBeCloseTo(1, 5);
	});

	it('is the threshold that decides, not the eye', () => {
		expect(t.contrast(rgb(119, 119, 119), rgb(136, 136, 136))).toBeLessThan(4.5);
	});

	it('drops to 3.0 only for genuinely large text', () => {
		expect(t.minContrastFor(24, 400)).toBe(3);
		expect(t.minContrastFor(19, 700)).toBe(3);
		expect(t.minContrastFor(19, 400)).toBe(4.5);
		expect(t.minContrastFor(16, 700)).toBe(4.5);
	});
});

describe('flipping lightness', () => {
	it('turns white into black and back', () => {
		expect(t.toCss(t.flipLightness(WHITE))).toBe('rgb(0, 0, 0)');
		expect(t.toCss(t.flipLightness(BLACK))).toBe('rgb(255, 255, 255)');
	});

	it('keeps the hue, so a red panel stays red', () => {
		const flipped = t.flipLightness(rgb(204, 0, 0));
		expect(flipped.r).toBeGreaterThan(flipped.g);
		expect(flipped.r).toBeGreaterThan(flipped.b);
		expect(t.lstar(flipped)).toBeGreaterThan(t.lstar(rgb(204, 0, 0)));
	});

	it('cannot help a mid grey — which is why the repair has a fallback', () => {
		// 128/255 is a hair over half, so the flip lands a hair under it. The point
		// is that it moves nowhere useful.
		const flipped = t.flipLightness(MID_GREY);
		expect(Math.abs(flipped.r - MID_GREY.r)).toBeLessThanOrEqual(1);
		expect(Math.abs(t.lstar(flipped) - t.lstar(MID_GREY))).toBeLessThan(1);
	});
});

describe('repairing text', () => {
	const TOKEN_FG = rgb(229, 229, 229);

	it('leaves readable text exactly as the notetype wrote it', () => {
		expect(t.repairTextColor(BLACK, WHITE, 4.5, TOKEN_FG)).toBeNull();
		// A red that already clears AA on white: the hue is the author's, not ours.
		expect(t.repairTextColor(rgb(190, 0, 0), WHITE, 4.5, TOKEN_FG)).toBeNull();
	});

	it('flips black text when the card went dark under it', () => {
		const fixed = t.repairTextColor(BLACK, rgb(10, 10, 10), 4.5, TOKEN_FG);
		expect(fixed).not.toBeNull();
		expect(t.contrast(fixed as RGB, rgb(10, 10, 10))).toBeGreaterThanOrEqual(4.5);
	});

	it('falls through to the theme colour when flipping is not enough', () => {
		// Mid grey on a dark card: too close to read, and flipping mid grey lands
		// back on mid grey, so the theme's own foreground has to take over.
		const bg = rgb(26, 26, 26);
		expect(t.contrast(MID_GREY, bg)).toBeLessThan(4.5);
		expect(t.toCss(t.repairTextColor(MID_GREY, bg, 4.5, TOKEN_FG) as RGB)).toBe(
			t.toCss(TOKEN_FG)
		);
	});

	it('still answers when neither the flip nor the theme colour clears it', () => {
		// Grey on grey with a foreground token that is itself too close: the last
		// resort is whichever of black or white wins, and it has to actually win.
		const bg = rgb(136, 136, 136);
		const fixed = t.repairTextColor(MID_GREY, bg, 4.5, rgb(140, 140, 140)) as RGB;
		expect(t.contrast(fixed, bg)).toBeGreaterThan(4.5);
		expect(t.toCss(fixed)).toBe('rgb(0, 0, 0)');
	});

	it('holds large text to the lower bar', () => {
		const fg = rgb(120, 120, 120);
		const bg = WHITE;
		expect(t.contrast(fg, bg)).toBeGreaterThan(3);
		expect(t.contrast(fg, bg)).toBeLessThan(4.5);
		expect(t.repairTextColor(fg, bg, 3, TOKEN_FG)).toBeNull();
		expect(t.repairTextColor(fg, bg, 4.5, TOKEN_FG)).not.toBeNull();
	});
});

describe('the stock notetype, end to end', () => {
	// `.card { color: black; background-color: white }` — what Anki ships, and the
	// reason any of this exists.
	it('is repaired in the dark theme and untouched in the light one', () => {
		expect(t.isWrongSide(WHITE, true)).toBe(true);
		expect(t.repairTextColor(BLACK, rgb(0, 0, 0), 4.5, rgb(229, 229, 229))).not.toBeNull();

		expect(t.isWrongSide(WHITE, false)).toBe(false);
		expect(t.repairTextColor(BLACK, WHITE, 4.5, rgb(42, 42, 42))).toBeNull();
	});
});
