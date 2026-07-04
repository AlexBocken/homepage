import type { Page } from '@playwright/test';

/**
 * Navigate and wait until the page is interactive. SSR markup is present
 * immediately, but Svelte only attaches event handlers after hydration — a click
 * fired before then is a silent no-op. Waiting for network-idle plus a short tick
 * gives hydration time to run before the test interacts.
 */
export async function gotoHydrated(page: Page, url: string): Promise<void> {
	await page.goto(url); // resolves on 'load'
	// Race networkidle with a cap: normal pages settle quickly (a good hydration
	// signal), while pages holding a live connection open (shopping-list SSE,
	// fitness sync) never reach idle and just hit the cap. Either way Svelte has
	// had time to attach handlers before the first interaction.
	await page.waitForLoadState('networkidle', { timeout: 2500 }).catch(() => {});
	await page.waitForTimeout(300);
}

/** Accept the app's themed confirm() dialog (ConfirmDialog.svelte). */
export async function acceptConfirm(page: import('@playwright/test').Page): Promise<void> {
	await page.locator('button.confirm-btn.confirm').click();
}
