import fs from 'node:fs';
import { test, expect, type Page, type Request, type TestInfo } from '@playwright/test';
import { storageStateFor } from '../helpers/auth';
import { gotoHydrated } from '../helpers/nav';

// What the recipe editors POST. Guards a later merge of the add and edit pages
// into one editor: the server actions (extractRecipeFromFormData & co.) read
// these exact field names, so the merged page must send the same set.
//
// The submission is intercepted in the browser and ABORTED before it reaches
// the server, so nothing is created or modified. The key sets are asserted
// inline (derived from the two pages' named inputs); the normalised values are
// additionally compared with a stored snapshot once one has been recorded
// (`--update-snapshots`), so a first run without a baseline does not fail.

test.use({ storageState: storageStateFor('recipes'), timezoneId: 'Europe/Zurich', locale: 'de-CH' });

// hefezopf is a seed.mjs fixture no other spec edits, so its values are stable.
const EDIT_FIXTURE = 'hefezopf';
const PROBE_SHORT_NAME = 'e2e_payload_probe';

const ADD_KEYS = [
	'add_info_json',
	'addendum',
	'category',
	'defaultForm_json',
	'description',
	'icon',
	'ingredients_json',
	'instructions_json',
	'isBaseRecipe',
	'name',
	'portions',
	'preamble',
	'relatedRecipes_json',
	'seasonRanges',
	'short_name',
	'tags'
];

const EDIT_KEYS = [
	...ADD_KEYS,
	// Edit-only bookkeeping.
	'datecreated',
	'existing_image_path',
	'images_json',
	'keep_existing_image',
	'note',
	'original_short_name',
	// NutritionMapper (edit page only), rendered unconditionally.
	'finalWeight_json',
	'globalOverwritesRemoved_json',
	'globalOverwrites_json',
	'nutritionMappings_json',
	// The fixture has an approved English translation, so it is re-posted.
	'translation_json',
	'translation_metadata_json'
].sort();

type Entry = [string, string];

/** Click `save`, catch the form POST to `path`, abort it, and return its fields. */
async function captureSubmission(page: Page, path: string, save: () => Promise<void>): Promise<Entry[]> {
	const isFormPost = (r: Request) => r.method() === 'POST' && new URL(r.url()).pathname === path;
	await page.route(
		(url) => url.pathname === path,
		async (route, request) => {
			if (request.method() !== 'POST') return route.fallback();
			await route.abort();
		}
	);
	const requestPromise = page.waitForRequest(isFormPost);
	await save();
	const request = await requestPromise;

	const body = request.postDataBuffer();
	expect(body, 'form POST carried no body').not.toBeNull();
	const contentType = request.headers()['content-type'] ?? '';
	// Let undici parse the multipart body exactly as the server would.
	const form = await new Response(new Uint8Array(body!), { headers: { 'content-type': contentType } }).formData();
	const entries: Entry[] = [];
	form.forEach((value, key) => {
		entries.push([key, typeof value === 'string' ? value : `<file ${value.name} ${value.type}>`]);
	});
	return entries;
}

/** JSON with sorted object keys, so key order in a serialiser is not a diff. */
function stableJson(v: unknown): string {
	const sort = (x: unknown): unknown => {
		if (Array.isArray(x)) return x.map(sort);
		if (x && typeof x === 'object') {
			return Object.fromEntries(
				Object.keys(x as Record<string, unknown>)
					.sort()
					.map((k) => [k, sort((x as Record<string, unknown>)[k])])
			);
		}
		return x;
	};
	return JSON.stringify(sort(v), null, 2);
}

/** Deterministic text form of the payload: sorted keys, JSON values pretty-printed,
 *  submit-time timestamps and generated ids masked. */
function normalisePayload(entries: Entry[]): string {
	const sorted = [...entries].sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
	return (
		sorted
			.map(([key, raw]) => {
				let value = raw;
				try {
					const parsed = JSON.parse(raw);
					if (parsed !== null && typeof parsed === 'object') {
						// Stamped with `new Date()` at submit time.
						if (key === 'translation_metadata_json' && 'lastModifiedGerman' in parsed) {
							parsed.lastModifiedGerman = '<submit-time>';
						}
						value = stableJson(parsed);
					}
				} catch {
					// plain string field
				}
				value = value
					.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>')
					.replace(/\b[0-9a-f]{24}\b/g, '<oid>');
				return `## ${key}\n${value}`;
			})
			.join('\n') + '\n'
	);
}

/** toMatchSnapshot, but only once a baseline exists (or is being recorded), so the
 *  normal suite does not fail on a fresh checkout. */
function matchSnapshotIfRecorded(testInfo: TestInfo, text: string, name: string) {
	const recording = ['all', 'changed'].includes(testInfo.config.updateSnapshots);
	if (recording || fs.existsSync(testInfo.snapshotPath(name))) {
		expect(text).toMatchSnapshot(name);
	} else {
		testInfo.annotations.push({
			type: 'snapshot-missing',
			description: `${name}: no baseline yet — record with --update-snapshots`
		});
	}
}

async function expectNotCreated(page: Page, shortName: string) {
	const res = await page.request.get(`/api/rezepte/items/${shortName}`);
	expect(res.ok(), `${shortName} must not exist — the POST should have been aborted`).toBe(false);
}

test('add editor posts the expected fields', async ({ page }, testInfo) => {
	await gotoHydrated(page, '/rezepte/add');

	await page.locator('input[name="short_name"]').fill(PROBE_SHORT_NAME);
	await page.locator('input[aria-label="Rezeptname"]').fill('E2E Payload Probe');
	await page.locator('input[aria-label="Kategorie"]').fill('Kuchen');

	const entries = await captureSubmission(page, '/rezepte/add', () =>
		page.locator('button[aria-label="Rezept erstellen"]').click()
	);

	expect([...new Set(entries.map(([k]) => k))].sort()).toEqual([...ADD_KEYS].sort());
	// No field may be posted twice (a merged editor rendering both variants would).
	expect(entries.length).toBe(ADD_KEYS.length);
	const get = (k: string) => entries.find(([key]) => key === k)?.[1];
	expect(get('short_name')).toBe(PROBE_SHORT_NAME);
	expect(get('name')).toBe('E2E Payload Probe');
	expect(get('category')).toBe('Kuchen');
	expect(get('isBaseRecipe')).toBe('false');

	matchSnapshotIfRecorded(testInfo, normalisePayload(entries), 'add-payload.txt');
	await expectNotCreated(page, PROBE_SHORT_NAME);
});

test('edit editor posts the expected fields', async ({ page }, testInfo) => {
	await gotoHydrated(page, `/rezepte/edit/${EDIT_FIXTURE}`);

	// Save untouched: the payload is then fully determined by the fixture.
	const entries = await captureSubmission(page, `/rezepte/edit/${EDIT_FIXTURE}`, () =>
		page.locator('button[aria-label="Rezept speichern"]').click()
	);

	expect([...new Set(entries.map(([k]) => k))].sort()).toEqual(EDIT_KEYS);
	expect(entries.length).toBe(EDIT_KEYS.length);
	const get = (k: string) => entries.find(([key]) => key === k)?.[1];
	expect(get('original_short_name')).toBe(EDIT_FIXTURE);
	expect(get('short_name')).toBe(EDIT_FIXTURE);
	expect(get('name')).toBe('Hefezopf');
	expect(get('category')).toBe('Brot');
	expect(get('keep_existing_image')).toBe('true');
	expect(JSON.parse(get('tags') ?? 'null')).toEqual(['süss', 'brot']);
	expect(JSON.parse(get('translation_json') ?? '{}').short_name).toBe('sweet-braid');

	matchSnapshotIfRecorded(testInfo, normalisePayload(entries), 'edit-payload.txt');
});
