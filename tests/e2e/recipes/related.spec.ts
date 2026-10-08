import { test, expect, type Page } from '@playwright/test';
import { ANONYMOUS, storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// "Ähnliche Rezepte" at the foot of a recipe page: automatic suggestions from
// the similarity index, and hand-picked links set in the editor (shown first,
// in both directions). Fixtures: e2e_aehnlich_{a,b,c}, e2e_verwandt(_ziel) in
// scripts/e2e/seed.mjs.

const related = (page: Page) => page.locator('section[aria-labelledby="related-title"]');
const card = (page: Page, name: string) => related(page).getByRole('link', { name, exact: true });

/** The index rebuilds a few seconds after a save, so reload until it shows. */
async function expectEventually(page: Page, check: () => Promise<boolean>) {
	await expect
		.poll(
			async () => {
				await page.reload();
				return check();
			},
			{ timeout: 30_000, intervals: [1_000, 2_000, 3_000] },
		)
		.toBe(true);
}

test.describe('automatic suggestions', () => {
	test.use({ storageState: ANONYMOUS });

	test('a recipe lists its near-identical siblings, at most three', async ({ page }) => {
		await gotoHydrated(page, '/rezepte/e2e_aehnlich_a');
		await expect(card(page, 'E2E Ähnlich B')).toBeVisible();
		await expect(card(page, 'E2E Ähnlich C')).toBeVisible();
		await expect(card(page, 'E2E Ähnlich A')).toHaveCount(0);
		expect(await related(page).locator('a.card-link').count()).toBeLessThanOrEqual(3);
	});

	test('the English page suggests only approved translations', async ({ page }) => {
		await gotoHydrated(page, '/recipes/e2e_similar_a');
		await expect(card(page, 'E2E Similar B')).toBeVisible();
		await expect(related(page).getByRole('link', { name: /E2E (Similar|Ähnlich) C/ })).toHaveCount(0);
		await expect(related(page).locator('a.card-link').first()).toHaveAttribute('href', /^\/recipes\//);
	});
});

test.describe('hand-picked related recipes', () => {
	test.use({ storageState: storageStateFor('recipes') });

	async function setPick(page: Page, add: boolean) {
		await gotoHydrated(page, '/rezepte/edit/e2e_verwandt');
		const picker = page.locator('#related-recipes-picker');
		if (add) {
			await picker.getByRole('combobox').fill('E2E Verwandt Ziel');
			await picker.getByRole('button', { name: 'E2E Verwandt Ziel', exact: true }).click();
		} else {
			await picker.getByRole('button', { name: /^E2E Verwandt Ziel / }).click();
		}
		await page.locator('button[aria-label="Rezept speichern"]').click();
		await page.waitForURL(/\/rezepte\/e2e_verwandt$/, { timeout: 20_000 });
	}

	test('a pick shows first, on both recipes, and goes away again', async ({ page }) => {
		await setPick(page, true);

		await expectEventually(page, async () => {
			const first = related(page).locator('a.card-link').first();
			return (await first.count()) > 0 && (await first.getAttribute('aria-label')) === 'E2E Verwandt Ziel';
		});

		// Symmetric: the target lists the recipe that picked it.
		await gotoHydrated(page, '/rezepte/e2e_verwandt_ziel');
		await expectEventually(page, async () => (await card(page, 'E2E Verwandt').count()) > 0);

		// Round trip: remove the pick, and it leaves the target's page too.
		await setPick(page, false);
		await gotoHydrated(page, '/rezepte/e2e_verwandt_ziel');
		await expectEventually(page, async () => (await card(page, 'E2E Verwandt').count()) === 0);
	});
});
