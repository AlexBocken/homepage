import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// The Bible reading log and plan of a signed-in reader. Round-trips: the
// spec ends with the log wiped, so it stays idempotent for the e2e_none user.

test.use({ storageState: storageStateFor('none') });

const today = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

test.beforeEach(async ({ request }) => {
	await request.delete('/api/glaube/bibel/gelesen', { data: { scope: 'all', today: today() } });
	await request.post('/api/glaube/bibel/plan', { data: { action: 'finish' } });
});

test('marking a chapter feeds the log, the streak and the index', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	const mark = page.locator('.rail .tool.read');
	await expect(mark).toHaveAttribute('aria-pressed', 'false');
	await mark.click();
	await expect(mark).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.rail .streak-row .number')).toHaveText('1');
	await page.goto('/glaube/bibel');
	await expect(page.locator('.books li.tracked', { hasText: 'Johannes' }).locator('.count')).toHaveText('1 / 21');
});

test('a plan starts, shows today, re-paces and can be ended', async ({ page }) => {
	await gotoHydrated(page, '/glaube/bibel/plan');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leseplan');
	await page.locator('.pace .pill', { hasText: '15' }).click();
	await page.locator('.choice', { hasText: 'Heilsgeschichte' }).getByRole('button', { name: 'Plan beginnen' }).click();
	await expect(page.getByRole('heading', { level: 1 })).toContainText('Heilsgeschichte');
	await expect(page.locator('.portion li').first()).toContainText('Genesis 1');
	// Mark the first item from the plan page; the day is not done after one chapter.
	await page.locator('.portion li').first().locator('.tick').click();
	await expect(page.locator('.portion li').first()).toHaveClass(/read/);
	await page.locator('.settings .pill', { hasText: '30' }).click();
	await expect(page.locator('.settings .pill', { hasText: '30' })).toHaveAttribute('aria-pressed', 'true');
	await page.getByRole('button', { name: 'Plan beenden' }).click();
	await page.getByRole('button', { name: 'Plan beenden' }).last().click();
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Leseplan');
	// The log survived the plan: the offer to credit it appears.
	await expect(page.locator('.choice', { hasText: 'Heilsgeschichte' }).locator('.credit')).toBeVisible();
});

test('on a phone, the day is drawn as a bar and its completion celebrated full-screen', async ({ page, request }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await gotoHydrated(page, '/glaube/bibel/joh/3');
	// No plan: no bar, and a chapter marked read is no occasion.
	await expect(page.locator('.daybar')).toHaveCount(0);
	await page.locator('.dock .mark').click();
	await expect(page.locator('.dock .mark')).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator('.celebrate')).toHaveCount(0);
	// A one-minute plan: Matthew 1 alone completes the day. The bar fills to
	// the end and the celebration shows the ring and the streak; a tap
	// dismisses it.
	await request.post('/api/glaube/bibel/plan', { data: { action: 'start', plan: 'nt', minutesPerDay: 1, today: today() } });
	await gotoHydrated(page, '/glaube/bibel/mt/1');
	const bar = page.getByRole('progressbar', { name: 'Heute' });
	await expect(bar).toBeVisible();
	await expect(bar).toHaveAttribute('aria-valuenow', '0');
	await page.locator('.dock .mark').click();
	const celebrate = page.locator('.celebrate');
	await expect(celebrate).toBeVisible();
	await expect(celebrate).toContainText('Tagesziel erreicht');
	await expect(celebrate.locator('.big-ring')).toBeVisible();
	await expect(celebrate.locator('.celebrate-streak .number')).toHaveText('1');
	await celebrate.click();
	await expect(celebrate).toHaveCount(0);
	await expect(bar).toHaveAttribute('aria-valuenow', '100');
	// The bar is a setting.
	await page.locator('.dock .aa').click();
	await page.locator('.sheet .settings label', { hasText: 'Tagesziel als Balken' }).click();
	await expect(page.locator('.daybar')).toHaveCount(0);
});

test('the reading record can be wiped in bulk', async ({ page, request }) => {
	await request.post('/api/glaube/bibel/gelesen', { data: { key: 'mt/1', day: today() } });
	await gotoHydrated(page, '/glaube/bibel/plan');
	await page.getByRole('button', { name: 'Alles löschen' }).click();
	await page.getByRole('button', { name: 'Löschen' }).last().click();
	await expect(page.locator('.record .stats')).toContainText('0 Kapitel');
});

// The reader's buttons are forms: without script they post to the chapter's
// own action and the page comes back re-read, so a chapter can be marked and
// unmarked from the rail and from the dock alike.
test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a chapter is marked read, and unmarked, through the form', async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto('/glaube/bibel/joh/3');
		const mark = page.locator('.rail .tool.read');
		await expect(mark).toHaveAttribute('aria-pressed', 'false');
		await mark.click();
		await expect(page).toHaveURL('/glaube/bibel/joh/3');
		await expect(mark).toHaveAttribute('aria-pressed', 'true');
		await expect(page.locator('.rail .streak-row .number')).toHaveText('1');
		await mark.click();
		await expect(page).toHaveURL('/glaube/bibel/joh/3');
		await expect(mark).toHaveAttribute('aria-pressed', 'false');
	});

	test("on a phone the dock's check does the same", async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/glaube/bibel/joh/3');
		const mark = page.locator('.dock .mark');
		await expect(mark).toBeVisible();
		await mark.click();
		await expect(page).toHaveURL('/glaube/bibel/joh/3');
		await expect(mark).toHaveAttribute('aria-pressed', 'true');
		await mark.click();
		await expect(mark).toHaveAttribute('aria-pressed', 'false');
	});
});
