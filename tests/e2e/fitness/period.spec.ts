import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The period tracker renders for a female profile (anna). Seeded cycles are
// deliberately varied (gaps [28,30,27,29,26], durations [5,4,6,5,4,6]) so the
// analysis has known expected values — mirrored by the projectCycles unit tests.

test.use({ storageState: storageStateFor('anna') });

test('cycle analysis shows the computed averages, spread and last-cycle stats', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	const stats = page.locator('.cycle-stats');
	await expect(stats).toBeVisible();

	// Cycle length: mean 28 days ± 1.6.
	const value = page.locator('.cycle-stat-value');
	const variance = page.locator('.cycle-stat-variance');
	await expect(value.nth(0)).toContainText('28');
	await expect(variance.nth(0)).toContainText('1.6');

	// Period length: mean 5 days ± 0.9.
	await expect(value.nth(1)).toContainText('5');
	await expect(variance.nth(1)).toContainText('0.9');

	// Most recent completed cycle (26) and period (6).
	const sub = page.locator('.cycle-stat-sub');
	await expect(sub.nth(0)).toContainText('26');
	await expect(sub.nth(1)).toContainText('6');
});

test('a regular cycle history surfaces the "regular" insight', async ({ page }) => {
	await gotoHydrated(page, '/fitness/check-in');
	// min 26 / max 30 (span 4, within 21–35) → the positive regularity insight.
	await expect(page.getByText(/looks regular|regelmässig/i)).toBeVisible();
});
