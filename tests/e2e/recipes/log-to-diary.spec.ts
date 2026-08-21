import { test, expect } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// Logging a recipe straight from its page: the dialog uses the same meal buttons and
// amount control as the diary, so this checks the shared pieces are actually wired
// up — a picked meal and a portion basis have to reach the entry that comes out.

test.use({ storageState: storageStateFor('full') });

function today() {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

test('logs a portion of a recipe to the diary', async ({ page }) => {
	// The one seeded recipe with working nutrition mappings, so the dialog has real
	// numbers to portion out.
	await gotoHydrated(page, '/rezepte/e2e_bildkuchen');

	await page.getByRole('button', { name: 'Zum Ernährungstagebuch' }).first().click();
	const dialog = page.getByRole('dialog', { name: 'Zum Ernährungstagebuch' });
	await expect(dialog).toBeVisible();

	// The shared meal picker, not a select: four buttons, the current one pressed.
	const breakfast = dialog.getByRole('button', { name: 'Frühstück' });
	await breakfast.click();
	await expect(breakfast).toHaveAttribute('aria-pressed', 'true');

	// It opens on one portion of the eight this fixture makes, and says what that
	// weighs before anything is logged.
	await expect(dialog.getByText(/kcal/)).toBeVisible();

	await dialog.getByRole('button', { name: 'Eintragen' }).click();
	await expect(dialog).toBeHidden();

	// The entry is real, belongs to the meal that was picked, and carries the recipe
	// as its source rather than a snapshot of its numbers.
	const res = await page.request.get(`/api/fitness/food-log?date=${today()}`);
	expect(res.ok()).toBeTruthy();
	const { entries } = await res.json();
	const logged = entries.filter((e: any) => e.source === 'recipe' && e.name.includes('Bildkuchen'));
	expect(logged.length).toBeGreaterThan(0);

	try {
		expect(logged.some((e: any) => e.mealType === 'breakfast')).toBe(true);
	} finally {
		for (const e of logged) await page.request.delete(`/api/fitness/food-log/${e._id}`);
	}
});

test('shows micronutrients as a share of a day, not bare numbers', async ({ page }) => {
	await gotoHydrated(page, '/rezepte/e2e_bildkuchen');

	// The panel is collapsed until asked for. The disclosure is a checkbox behind a
	// label, so it works with JavaScript off — which is why this clicks the label.
	await page.locator('label.details-toggle').click();

	// Every reference-intake row states what it is a share of, so a percentage on a
	// recipe page can be compared with the same nutrient in the diary.
	await expect(page.getByText('% der Tagesreferenzmenge')).toBeVisible();
	// The rows carry a bar and a percentage, not a bare milligram figure. Which
	// nutrient leads is left to the fixture's own ingredients.
	await expect(page.locator('.micro-row').first()).toBeVisible();
	await expect(page.locator('.micro-pct', { hasText: '%' }).first()).toBeVisible();
});
