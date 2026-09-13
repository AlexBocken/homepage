import { test, expect } from '@playwright/test';
import { ANONYMOUS } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

test.use({ storageState: ANONYMOUS });

test('rosary renders and lets you pick a mystery set', async ({ page }) => {
	await gotoHydrated(page, '/glaube/rosenkranz');
	await expect(page.getByRole('heading', { name: 'Interaktiver Rosenkranz', level: 1 })).toBeVisible();

	const buttons = page.locator('a.mystery-button');
	await expect(buttons.first()).toBeVisible();

	const glorreich = buttons.filter({ hasText: 'Glorreichen' });
	await glorreich.click();
	await expect(glorreich).toHaveClass(/selected/);
});

test('luminous toggle adds/removes the fourth mystery', async ({ page }) => {
	await gotoHydrated(page, '/glaube/rosenkranz');
	const buttons = page.locator('a.mystery-button');
	const before = await buttons.count();

	// Toggle.svelte renders the label text next to the control (matches >1 node).
	const toggle = page.getByText('Lichtreiche Geheimnisse einbeziehen').first();
	await toggle.click();
	await expect.poll(() => buttons.count()).toBe(before === 4 ? 3 : before + 1);
	await toggle.click();
	await expect.poll(() => buttons.count()).toBe(before);
});

test('a bible reference is a link into the reader, and peeks the passage instead', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/rosenkranz');
	const ref = page.locator('.bible-reference-link').first();
	// The citation is a real link first — see the no-JS block below — and the
	// peek is what script puts in its place.
	await expect(ref).toHaveAttribute('href', /^\/glaube\/bibel\/[^/]+\/\d+#v\d+$/);
	await ref.click();
	await expect(page.locator('.peek').first()).toBeVisible();
	await expect(page).toHaveURL('/glaube/rosenkranz');
});

test('a bible reference is set like one in the reader: no icon, upright serif', async ({ page }) => {
	await gotoHydrated(page, '/glaube/rosenkranz');
	const ref = page.locator('.bible-reference-link').first();
	await expect(ref.locator('svg')).toHaveCount(0);
	await expect(ref).toHaveCSS('font-style', 'normal');
	await expect(ref).toHaveCSS('font-family', /Libertine|Georgia|serif/);
});

test('the streak explainer cites the Catechism, and the citation peeks over the dialog', async ({ page }) => {
	await page.setViewportSize({ width: 1400, height: 900 });
	await gotoHydrated(page, '/glaube/rosenkranz');
	await page.locator('.streak-container .info-btn').click();
	const dialog = page.getByRole('dialog', { name: 'Über diese Zählung' });
	await expect(dialog).toBeVisible();

	const ccc = dialog.locator('.cref').first();
	await expect(ccc).toHaveText('KKK 2698');
	await ccc.hover();
	const peek = page.locator('.peek').first();
	await expect(peek).toBeVisible();
	// Hovering it is the proof it sits above the dialog: a covered element
	// fails Playwright's hit test rather than being merely invisible.
	await peek.hover();
	await expect(dialog).toBeVisible();

	// The verse in the same paragraph peeks too, out of the Bible.
	const verse = dialog.locator('.ref').first();
	await expect(verse).toHaveText('Mt 6,7');
	await verse.hover();
	await expect(page.locator('.peek').first()).toBeVisible();
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('a bible reference still leads to the reader, on its verse', async ({ page }) => {
		await page.setViewportSize({ width: 1400, height: 900 });
		await page.goto('/glaube/rosenkranz');
		const ref = page.locator('.bible-reference-link').first();
		const href = (await ref.getAttribute('href'))!;
		expect(href).toMatch(/^\/glaube\/bibel\/[^/]+\/\d+#v\d+$/);
		await ref.click();
		await expect(page).toHaveURL(href);
		// The verse is on screen and clear of the sticky header — the opening
		// verse of a chapter has no half-screen above it to be centred in, so
		// `scroll-margin-block` on `.v` clamps and this is what it must leave.
		// (bible.spec.ts checks the centring itself, on a verse that can be.)
		const verse = page.locator(href.slice(href.indexOf('#')));
		await expect(verse).toBeInViewport();
		const header = (await page.locator('.header-shell').boundingBox())!;
		const box = (await verse.boundingBox())!;
		expect(box.y).toBeGreaterThanOrEqual(header.y + header.height);
	});

	test('the mystery images stand among the prayers, centred', async ({ page }) => {
		await page.setViewportSize({ width: 1000, height: 900 });
		await page.goto('/glaube/rosenkranz');
		// Under 1200px there is no image column and no PiP without script, so
		// the pictures are inline in the decade they belong to.
		const figure = page.locator('.decade-inline-image').first();
		await expect(figure).toBeVisible();
		const img = figure.locator('img');
		const fb = (await figure.boundingBox())!;
		const ib = (await img.boundingBox())!;
		// Guard the assertion below from passing on a picture that simply fills
		// the figure — then centring would say nothing.
		expect(ib.width).toBeLessThan(fb.width - 8);
		expect(Math.abs(ib.x + ib.width / 2 - (fb.x + fb.width / 2))).toBeLessThan(2);
	});
});
