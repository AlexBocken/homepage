/**
 * Scrapes the full ExerciseDB v2 API (via RapidAPI) and saves raw data.
 *
 * Run with: RAPIDAPI_KEY=... pnpm exec vite-node scripts/scrape-exercises.ts
 *
 * Outputs: src/lib/data/exercisedb-raw.json
 *
 * Supports resuming — already-fetched exercises are read from the output file
 * and skipped. Saves to disk after every detail fetch.
 */
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const API_HOST = 'edb-with-videos-and-images-by-ascendapi.p.rapidapi.com';
const API_KEY = process.env.RAPIDAPI_KEY;
if (!API_KEY) {
	console.error('Set RAPIDAPI_KEY environment variable');
	process.exit(1);
}

const BASE = `https://${API_HOST}/api/v1`;
const HEADERS = {
	'x-rapidapi-host': API_HOST,
	'x-rapidapi-key': API_KEY,
};

const OUTPUT_PATH = resolve('src/lib/data/exercisedb-raw.json');
const IDS_CACHE_PATH = resolve('src/lib/data/.exercisedb-ids.json');
const DELAY_MS = 1500;
const MAX_RETRIES = 5;

function sleep(ms: number) {
	return new Promise(r => setTimeout(r, ms));
}

async function apiFetch(path: string, attempt = 1): Promise<any> {
	const res = await fetch(`${BASE}${path}`, { headers: HEADERS });
	if (res.status === 429 && attempt <= MAX_RETRIES) {
		const wait = DELAY_MS * 2 ** attempt;
		console.warn(`    rate limited on ${path}, retrying in ${wait}ms...`);
		await sleep(wait);
		return apiFetch(path, attempt + 1);
	}
	if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
	return res.json();
}

function loadExisting(): { metadata: any; exercises: any[] } | null {
	if (!existsSync(OUTPUT_PATH)) return null;
	try {
		const data = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
		if (data.exercises?.length) {
			console.log(`  found existing file with ${data.exercises.length} exercises`);
			return { metadata: data.metadata, exercises: data.exercises };
		}
	} catch {}
	return null;
}

function saveToDisk(metadata: any, exercises: any[]) {
	const output = {
		scrapedAt: new Date().toISOString(),
		metadata,
		exercises,
	};
	writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
}

async function fetchAllIds(): Promise<string[]> {
	const ids: string[] = [];
	let cursor: string | undefined;

	while (true) {
		const params = new URLSearchParams({ limit: '100' });
		if (cursor) params.set('after', cursor);

		const res = await apiFetch(`/exercises?${params}`);
		for (const ex of res.data) {
			ids.push(ex.exerciseId);
		}
		console.log(`  fetched page, ${ids.length} IDs so far`);

		if (!res.meta.hasNextPage) break;
		cursor = res.meta.nextCursor;
		await sleep(DELAY_MS);
	}

	return ids;
}

async function fetchMetadata() {
	const endpoints = ['/bodyparts', '/equipments', '/muscles', '/exercisetypes'] as const;
	const keys = ['bodyParts', 'equipments', 'muscles', 'exerciseTypes'] as const;
	const result: Record<string, any> = {};

	for (let i = 0; i < endpoints.length; i++) {
		const res = await apiFetch(endpoints[i]);
		result[keys[i]] = res.data;
		await sleep(DELAY_MS);
	}

	return result;
}

async function main() {
	console.log('=== ExerciseDB v2 Scraper ===\n');

	const existing = loadExisting();
	const fetchedIds = new Set(existing?.exercises.map((e: any) => e.exerciseId) ?? []);

	console.log('Fetching metadata...');
	const metadata = existing?.metadata ?? await fetchMetadata();
	if (!existing?.metadata) {
		console.log(`  ${metadata.bodyParts.length} body parts, ${metadata.equipments.length} equipments, ${metadata.muscles.length} muscles, ${metadata.exerciseTypes.length} exercise types\n`);
	} else {
		console.log('  using cached metadata\n');
	}

	let ids: string[];
	if (existsSync(IDS_CACHE_PATH)) {
		ids = JSON.parse(readFileSync(IDS_CACHE_PATH, 'utf-8'));
		console.log(`Using cached exercise IDs (${ids.length})\n`);
	} else {
		console.log('Fetching exercise IDs...');
		ids = await fetchAllIds();
		writeFileSync(IDS_CACHE_PATH, JSON.stringify(ids));
		console.log(`  ${ids.length} total exercises\n`);
	}

	const remaining = ids.filter(id => !fetchedIds.has(id));
	if (remaining.length === 0) {
		console.log('All exercises already fetched!');
		return;
	}
	console.log(`Fetching ${remaining.length} remaining details (${fetchedIds.size} already cached)...`);

	const exercises = [...(existing?.exercises ?? [])];

	for (const id of remaining) {
		const detail = await apiFetch(`/exercises/${id}`);
		exercises.push(detail.data);
		saveToDisk(metadata, exercises);

		if (exercises.length % 10 === 0 || exercises.length === ids.length) {
			console.log(`  ${exercises.length}/${ids.length} details fetched`);
		}
		await sleep(DELAY_MS);
	}

	console.log(`\nDone! ${exercises.length} exercises written to ${OUTPUT_PATH}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
