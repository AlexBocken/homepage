import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import { createDarkMode, isDarkTheme, onThemeChange } from '$lib/js/darkMode.svelte';

/** jsdom has no matchMedia; stand in one whose `matches` and listeners we drive. */
function installMatchMedia(initial: boolean) {
	const listeners = new Set<() => void>();
	const mql = {
		matches: initial,
		addEventListener: (_: string, cb: () => void) => listeners.add(cb),
		removeEventListener: (_: string, cb: () => void) => listeners.delete(cb)
	};
	window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;
	return {
		listeners,
		setOs(dark: boolean) {
			mql.matches = dark;
			for (const cb of [...listeners]) cb();
		}
	};
}

/** MutationObserver callbacks run as microtasks. */
const tick = () => new Promise((r) => setTimeout(r, 0));

const root = document.documentElement;
let originalMatchMedia: typeof window.matchMedia;

beforeEach(() => {
	originalMatchMedia = window.matchMedia;
	root.removeAttribute('data-theme');
});
afterEach(() => {
	window.matchMedia = originalMatchMedia;
	root.removeAttribute('data-theme');
});

describe('isDarkTheme', () => {
	it('prefers data-theme and falls back to the OS preference', () => {
		const media = installMatchMedia(true);
		expect(isDarkTheme()).toBe(true);
		root.setAttribute('data-theme', 'light');
		expect(isDarkTheme()).toBe(false);
		root.setAttribute('data-theme', 'dark');
		media.setOs(false);
		expect(isDarkTheme()).toBe(true);
		root.removeAttribute('data-theme');
		expect(isDarkTheme()).toBe(false);
	});
});

describe('onThemeChange', () => {
	it('fires on data-theme writes and OS flips, and unsubscribes', async () => {
		const media = installMatchMedia(false);
		const cb = vi.fn();
		const off = onThemeChange(cb);

		root.setAttribute('data-theme', 'dark');
		await tick();
		expect(cb).toHaveBeenCalledTimes(1);

		media.setOs(true);
		expect(cb).toHaveBeenCalledTimes(2);

		root.setAttribute('class', 'unrelated');
		await tick();
		expect(cb).toHaveBeenCalledTimes(2);

		off();
		expect(media.listeners.size).toBe(0);
		root.setAttribute('data-theme', 'light');
		media.setOs(false);
		await tick();
		expect(cb).toHaveBeenCalledTimes(2);
		root.removeAttribute('class');
	});
});

describe('createDarkMode', () => {
	it('re-runs dependants when data-theme or the OS preference changes', async () => {
		const media = installMatchMedia(false);
		const seen: boolean[] = [];
		let colour = '';
		const cleanup = $effect.root(() => {
			const theme = createDarkMode();
			const primary = $derived(theme.dark ? '#88C0D0' : '#5E81AC');
			$effect(() => {
				seen.push(theme.dark);
				colour = primary;
			});
		});
		flushSync();
		expect(seen).toEqual([false]);
		expect(colour).toBe('#5E81AC');
		expect(media.listeners.size).toBe(1);

		root.setAttribute('data-theme', 'dark');
		await tick();
		flushSync();
		expect(seen.at(-1)).toBe(true);
		expect(colour).toBe('#88C0D0');

		root.removeAttribute('data-theme'); // back to the OS, which is light
		await tick();
		flushSync();
		expect(colour).toBe('#5E81AC');

		media.setOs(true);
		flushSync();
		expect(colour).toBe('#88C0D0');

		cleanup();
		await tick();
		expect(media.listeners.size).toBe(0);
	});

	it('stays current when only read outside an effect (e.g. a click handler)', async () => {
		installMatchMedia(false);
		let read = () => '';
		const cleanup = $effect.root(() => {
			const theme = createDarkMode();
			const primary = $derived(theme.dark ? 'dark' : 'light');
			read = () => primary;
		});
		flushSync();
		expect(read()).toBe('light');
		root.setAttribute('data-theme', 'dark');
		await tick();
		expect(read()).toBe('dark');
		cleanup();
	});
});
