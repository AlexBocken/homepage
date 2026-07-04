import type { Page } from '@playwright/test';

/**
 * Navigate and wait until the page is interactive. SSR markup is present
 * immediately, but Svelte only attaches event handlers after hydration — a click
 * fired before then is a silent no-op. Waiting for network-idle plus a short tick
 * gives hydration time to run before the test interacts.
 */
export async function gotoHydrated(page: Page, url: string): Promise<void> {
	await page.goto(url);
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(300);
}
