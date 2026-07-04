#!/usr/bin/env node
// Clone realistic, NON-personal content from the local dev Mongo into the
// throwaway test Mongo, to give the e2e suite lifelike volume/variety. Personal
// domains (payments, fitness, tasks, period, measurements) are deliberately NOT
// cloned — they belong to real accounts whose nicknames don't match the e2e_*
// test users; those are owned by the test users via the deterministic overlay
// (seed.mjs) instead.
//
// Graceful: if the dev DB is unreachable (e.g. CI), this logs a notice and exits
// 0, so the overlay alone still yields a working DB.
//
// Source: dev MONGO_URL from .env (override with E2E_DEV_MONGO_URL).
// Dest:   test MONGO_URL from env/.env.test.
// Tune collections with E2E_CLONE_COLLECTIONS=a,b,c ; sample OFF with
// E2E_CLONE_OFF=5000.

import mongoose from 'mongoose';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function envFrom(file, key) {
	try {
		const raw = readFileSync(resolve(REPO, file), 'utf8');
		const m = raw.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, 'm'));
		if (!m) return undefined;
		return m[1].trim().replace(/^["']|["']$/g, '');
	} catch {
		return undefined;
	}
}

const SOURCE = process.env.E2E_DEV_MONGO_URL || envFrom('.env', 'MONGO_URL');
const DEST = process.env.MONGO_URL || envFrom('.env.test', 'MONGO_URL');

// Non-personal content collections. Order-independent.
const DEFAULT_COLLECTIONS = ['recipes', 'totryrecipes', 'shoppingitemcategories', 'nutritionoverwrites', 'exchangerates'];
const COLLECTIONS = (process.env.E2E_CLONE_COLLECTIONS
	? process.env.E2E_CLONE_COLLECTIONS.split(',').map((s) => s.trim()).filter(Boolean)
	: DEFAULT_COLLECTIONS);
// Optional extra random sample of the ~1M-doc OpenFoodFacts cache (0 = skip).
const OFF_LIMIT = Number(process.env.E2E_CLONE_OFF || 0);
// Real OFF products are always pulled for these (brand) terms so food search
// reliably returns an OFF-source result. Overridable.
const OFF_TERMS = (process.env.E2E_CLONE_OFF_TERMS
	? process.env.E2E_CLONE_OFF_TERMS.split(',').map((s) => s.trim()).filter(Boolean)
	: ['nutella', 'coca-cola', 'cola', 'oreo', 'haribo', 'pringles']);
const OFF_PER_TERM = 40;

async function connect(url, name) {
	const c = mongoose.createConnection(url, { serverSelectionTimeoutMS: 6000 });
	await c.asPromise();
	console.log(`  connected: ${name}`);
	return c;
}

async function copyAll(src, dst, coll, limit = 0) {
	const cursor = src.collection(coll).find({}, limit ? { limit } : {});
	const docs = await cursor.toArray();
	await dst.collection(coll).deleteMany({});
	if (docs.length) {
		// Chunk to keep individual inserts reasonable.
		for (let i = 0; i < docs.length; i += 1000) {
			await dst.collection(coll).insertMany(docs.slice(i, i + 1000), { ordered: false });
		}
	}
	console.log(`  ${coll}: ${docs.length}`);
}

// Pull real OFF products matching each term (deduped by barcode) and build the
// $text index the app's food search relies on.
async function cloneOffTargeted(src, dst) {
	const seen = new Map();
	for (const term of OFF_TERMS) {
		const docs = await src.collection('openfoodfacts')
			.find({ name: { $regex: term, $options: 'i' } }).limit(OFF_PER_TERM).toArray();
		for (const d of docs) seen.set(d.barcode, d);
	}
	const all = [...seen.values()];
	await dst.collection('openfoodfacts').deleteMany({});
	if (all.length) await dst.collection('openfoodfacts').insertMany(all, { ordered: false });
	await dst.collection('openfoodfacts')
		.createIndex({ name: 'text', nameDe: 'text', brands: 'text' }, { name: 'off_text' })
		.catch(() => {});
	console.log(`  openfoodfacts: ${all.length} (terms: ${OFF_TERMS.join(', ')}) + text index`);
}

async function main() {
	if (!SOURCE) {
		console.log('ℹ️  No dev MONGO_URL found (.env); skipping clone, overlay only.');
		return;
	}
	if (!DEST) throw new Error('No dest MONGO_URL (env / .env.test)');

	let src;
	try {
		src = await connect(SOURCE, 'dev (source)');
	} catch (e) {
		console.log(`ℹ️  Dev DB unreachable (${e.message.split('\n')[0]}); skipping clone, overlay only.`);
		return;
	}
	const dst = await connect(DEST, 'test (dest)');

	console.log('📋 Cloning content collections dev → test:');
	for (const coll of COLLECTIONS) await copyAll(src, dst, coll);

	console.log('📋 Cloning OpenFoodFacts products by term:');
	await cloneOffTargeted(src, dst);
	if (OFF_LIMIT > 0) {
		console.log(`📋 Additionally sampling openfoodfacts (limit ${OFF_LIMIT}):`);
		await copyAll(src, dst, 'openfoodfacts', OFF_LIMIT);
	}

	await src.close();
	await dst.close();
	console.log('✅ Clone complete.');
}

main().catch((e) => {
	console.error('❌ Clone failed:', e.message);
	process.exit(1);
});
