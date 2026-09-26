import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isTauri, isStandaloneDisplay, isStandalone } from '$lib/js/standalone';

let displayStandalone = false;

beforeEach(() => {
	displayStandalone = false;
	vi.stubGlobal('matchMedia', (q: string) => ({
		matches: q === '(display-mode: standalone)' && displayStandalone
	}));
	vi.spyOn(document, 'referrer', 'get').mockReturnValue('');
});

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	delete (window as { __TAURI__?: unknown }).__TAURI__;
	delete (navigator as { standalone?: boolean }).standalone;
});

describe('standalone detection', () => {
	it('plain browser tab: none of them', () => {
		expect([isTauri(), isStandaloneDisplay(), isStandalone()]).toEqual([false, false, false]);
	});

	it('installed PWA window: display + standalone, not Tauri', () => {
		displayStandalone = true;
		expect([isTauri(), isStandaloneDisplay(), isStandalone()]).toEqual([false, true, true]);
	});

	it('iOS home-screen app: display + standalone', () => {
		(navigator as { standalone?: boolean }).standalone = true;
		expect([isStandaloneDisplay(), isStandalone()]).toEqual([true, true]);
	});

	it('Tauri shell: Tauri + standalone, not display', () => {
		(window as { __TAURI__?: unknown }).__TAURI__ = {};
		expect([isTauri(), isStandaloneDisplay(), isStandalone()]).toEqual([true, false, true]);
	});

	it('launched from the Android home screen: only the broad check', () => {
		vi.spyOn(document, 'referrer', 'get').mockReturnValue('android-app://org.bocken/');
		expect([isTauri(), isStandaloneDisplay(), isStandalone()]).toEqual([false, false, true]);
	});
});
