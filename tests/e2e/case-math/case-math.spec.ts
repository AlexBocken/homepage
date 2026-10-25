import { test, expect, type Page } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';
import { questionFor } from '../../../src/lib/js/caseMath/skills';
import { showAnswer } from '../../../src/lib/js/caseMath/display';

// The owner-only case-math trainer, driven as the owner (username `alexander`,
// no groups). seed.mjs clears the owner's case-math history before each run;
// the specs share it, so they run in order and assert on deltas where another
// spec could have added to the totals.

test.use({ storageState: storageStateFor('owner') });
test.describe.configure({ mode: 'serial' });

const drill = (page: Page) => page.locator('section.drill');
const answerBox = (page: Page) => page.getByLabel('Your answer');

/** The question on screen, regenerated from the drill's data-* attributes. */
async function currentQuestion(page: Page) {
	const el = drill(page);
	const [skill, level, seed] = await Promise.all([
		el.getAttribute('data-skill'),
		el.getAttribute('data-level'),
		el.getAttribute('data-seed')
	]);
	return { skill: skill!, level: Number(level), seed: Number(seed), q: questionFor(skill!, Number(level), Number(seed)) };
}

/** Answer the current question (right or wrong) and wait until it's graded. */
async function answer(page: Page, right: boolean) {
	const { q, seed } = await currentQuestion(page);
	await answerBox(page).fill(right ? String(q.answer) : '-999999');
	await answerBox(page).press('Enter');
	await expect(drill(page)).toHaveAttribute('data-phase', 'feedback');
	return { q, seed };
}

async function stats(page: Page) {
	const res = await page.request.get('/api/case-math/stats');
	expect(res.ok()).toBe(true);
	return res.json();
}

test('the dashboard lists every skill group and links into drills', async ({ page }) => {
	await gotoHydrated(page, '/case-math');
	await expect(page.getByRole('heading', { name: 'Core arithmetic' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Case math', exact: true }).last()).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Estimation' })).toBeVisible();
	await page.getByRole('link', { name: 'Squares' }).click();
	await expect(page).toHaveURL(/\/case-math\/drill\/squares$/);
	await expect(drill(page)).toHaveAttribute('data-skill', 'squares');
});

test('a full daily set: grading, the worked solution on a miss, and the saved result', async ({ page }) => {
	await gotoHydrated(page, '/case-math/daily');
	const total = Number((await drill(page).locator('.count').textContent())!.match(/\/\s*(\d+)/)![1]);
	expect(total).toBe(20);

	const misses = new Set([2, 9]);
	for (let i = 0; i < total; i++) {
		await expect(drill(page).locator('.count')).toHaveText(`${i + 1} / ${total}`);
		const right = !misses.has(i);
		const { q } = await answer(page, right);
		if (right) {
			await expect(page.getByText('Right', { exact: true })).toBeVisible();
			// Correct answers move on by themselves.
		} else {
			await expect(drill(page).getByText(showAnswer(q.answer, q.unit), { exact: true })).toBeVisible();
			await expect(drill(page).getByText(q.steps[0], { exact: true })).toBeVisible();
			await expect(drill(page).getByText(/Rule of thumb/)).toBeVisible();
			await page.getByRole('button', { name: /Next/ }).click();
		}
		if (i < total - 1) await expect(drill(page)).toHaveAttribute('data-phase', 'answer');
	}

	await expect(page.getByRole('heading', { name: 'Daily set done' })).toBeVisible();
	await expect(page.getByText(`${total - misses.size}/${total}`, { exact: true })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Review' })).toBeVisible();
	await expect(page.getByText('Saving…')).toHaveCount(0);
	await expect(page.getByText(/Couldn't save/)).toHaveCount(0);

	// Back on the dashboard, today counts toward the streak.
	await page.getByRole('link', { name: 'Back to practice' }).click();
	await expect(page).toHaveURL(/\/case-math$/);
	await expect(page.getByText(/Today's set is done/)).toBeVisible();
	await expect(page.locator('.streak strong')).toHaveText('1');

	const s = await stats(page);
	expect(s.dailyDates).toHaveLength(1);
	expect(s.recent[0]).toMatchObject({ mode: 'daily', count: total, correct: total - misses.size });
});

test('the server grades answers itself rather than trusting the client', async ({ page }) => {
	const q = questionFor('squares', 1, 4242);
	const res = await page.request.post('/api/case-math/sessions', {
		data: {
			mode: 'free',
			date: '2026-01-01',
			durationMs: 5000,
			attempts: [
				{ skill: 'squares', level: 1, seed: 4242, given: String(q.answer), ms: 2000 },
				{ skill: 'squares', level: 1, seed: 4242, given: String(q.answer + 1), ms: 2000 }
			]
		}
	});
	expect(res.status()).toBe(201);
	const body = await res.json();
	expect(body.attempts.map((a: { correct: boolean }) => a.correct)).toEqual([true, false]);
	expect(body.correct).toBe(1);

	const bad = await page.request.post('/api/case-math/sessions', {
		data: { mode: 'free', date: '2026-01-01', attempts: [{ skill: 'nope', level: 1, seed: 1, given: '1', ms: 1 }] }
	});
	expect(bad.status()).toBe(400);
});

test('ten quick right answers in free play promote the skill a level', async ({ page }) => {
	await gotoHydrated(page, '/case-math/drill/mul-tricks');
	await page.getByRole('button', { name: 'Level 1', exact: true }).click();
	await expect(drill(page)).toHaveAttribute('data-level', '1');
	await expect(page.getByText(/Rule of thumb/)).toBeVisible();
	await expect(page.getByText(/Your current level/)).toBeVisible();

	for (let i = 0; i < 10; i++) {
		await answer(page, true);
		await expect(drill(page)).toHaveAttribute('data-phase', 'answer');
	}
	await page.getByRole('button', { name: /Finish & save/ }).click();
	await expect(page.getByRole('heading', { name: 'Session saved' })).toBeVisible();
	await expect(page.getByText('10/10', { exact: true })).toBeVisible();
	await expect(page.getByText(/Multiplication shortcuts: level 1 → 2/)).toBeVisible();

	// The drill now opens at the new level.
	await gotoHydrated(page, '/case-math/drill/mul-tricks');
	await expect(drill(page)).toHaveAttribute('data-level', '2');
});

test('leaving a drill half-way still saves what was answered', async ({ page }) => {
	const before = (await stats(page)).skills['percent-of'].attempts;
	await gotoHydrated(page, '/case-math/drill/percent-of');
	await answer(page, true);
	await expect(drill(page)).toHaveAttribute('data-phase', 'answer');
	await answer(page, false);

	// Client-side navigation away unmounts the drill, which flushes the answers.
	await page.getByRole('link', { name: 'Progress' }).click();
	await expect(page).toHaveURL(/\/case-math\/progress$/);
	await expect.poll(async () => (await stats(page)).skills['percent-of'].attempts).toBe(before + 2);
});

test('progress shows the trend chart and per-skill table', async ({ page }) => {
	await gotoHydrated(page, '/case-math/progress');
	await expect(page.getByRole('heading', { name: 'Weekly trend' })).toBeVisible();
	await expect(page.locator('canvas[aria-label="Weekly accuracy and speed"]')).toBeVisible();
	const row = page.locator('tr', { has: page.getByRole('link', { name: 'Multiplication shortcuts' }) });
	await expect(row.locator('td').nth(1)).toHaveText('2');
	await page.getByLabel('Skill').selectOption('mul-tricks');
	await expect(page.locator('canvas[aria-label="Weekly accuracy and speed"]')).toBeVisible();
});

test('the rules of thumb page links each rule to its drill', async ({ page }) => {
	await gotoHydrated(page, '/case-math/learn');
	const fractions = page.locator('article#fractions');
	await expect(fractions.getByText('1/7')).toBeVisible();
	await fractions.getByRole('link', { name: 'Practice this' }).click();
	await expect(page).toHaveURL(/\/case-math\/drill\/fractions$/);
});
