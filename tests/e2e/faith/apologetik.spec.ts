import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('apologetik landing links to the contra case', async ({ page }) => {
	await page.goto('/glaube/apologetik');
	await expect(page.getByRole('heading', { name: 'Apologetik', level: 1 })).toBeVisible();

	await page.locator('a.case-card.contra').click();
	await expect(page).toHaveURL(/\/apologetik\/contra/);
});

test('contra archetype legend filters the argument feed', async ({ page }) => {
	await gotoHydrated(page, '/glaube/apologetik/contra');
	const rows = page.locator('article.arg-row');
	await expect(rows.first()).toBeVisible();
	const before = await rows.count();

	const voice = page.locator('button.legend-item').first();
	if (await voice.count()) {
		await voice.click();
		await expect(page.locator('.filter-banner')).toBeVisible();
		await expect.poll(() => rows.count()).toBeLessThanOrEqual(before);
	}
});
