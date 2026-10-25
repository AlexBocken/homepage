/**
 * One-off migration for the shopping classifier (ShoppingItemCategory):
 *
 * 1. Tag existing docs with `source`. The old schema had no flag, but the
 *    override endpoint updated docs in place while the categorizer only ever
 *    inserted them — so `updatedAt > createdAt` means a user saved it.
 * 2. Apply label corrections agreed on while reviewing the prod labels.
 * 3. Delete the `auto` docs: old cached guesses the categorizer no longer reads.
 *
 * Dry run by default; pass --apply to write. Writes a JSON backup of every doc
 * it would touch to the given directory (default: cwd) before applying.
 *
 * Run: MONGO_URL='mongodb://…' pnpm exec vite-node scripts/shopping-labels-migrate.ts [--apply] [--backup-dir DIR]
 */
import mongoose from 'mongoose';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { ShoppingItemCategory } from '../src/models/ShoppingItemCategory';

const CORRECTIONS: { name: string; category: string; icon?: string }[] = [
	{ name: 'wraps', category: 'Pasta, Reis & Getreide' },
	{ name: 'dill', category: 'Obst & Gemüse' },
	{ name: 'dillspitzen', category: 'Gewürze & Saucen', icon: 'kraeuter' },
	{ name: 'rohrreiniger', category: 'Haushalt', icon: 'putzmittel' }
];

const apply = process.argv.includes('--apply');
const dirArg = process.argv.indexOf('--backup-dir');
const backupDir = resolve(dirArg > 0 ? process.argv[dirArg + 1] : '.');

const url = process.env.MONGO_URL;
if (!url) throw new Error('MONGO_URL is not set');
await mongoose.connect(url, { serverSelectionTimeoutMS: 8000 });

const docs = await ShoppingItemCategory.find({}).lean();
const isManual = (d: (typeof docs)[number]) =>
	d.source === 'manual' ||
	(!d.source && new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime() > 1000);
const manual = docs.filter(isManual);
const auto = docs.filter((d) => !isManual(d));
console.log(`${docs.length} docs: ${manual.length} manual, ${auto.length} auto`);

const byName = new Map(docs.map((d) => [d.normalizedName, d]));
for (const c of CORRECTIONS) {
	const d = byName.get(c.name);
	console.log(
		`  correct "${c.name}": ${d ? `${d.category} / ${d.icon}` : '(new)'} → ${c.category} / ${c.icon ?? d?.icon ?? null}`
	);
}
const corrected = new Set(CORRECTIONS.map((c) => c.name));
const toDelete = auto.filter((d) => !corrected.has(d.normalizedName));
console.log(`  delete ${toDelete.length} auto docs: ${toDelete.map((d) => d.normalizedName).join(', ')}`);

if (!apply) {
	console.log('\nDry run — pass --apply to write.');
} else {
	const backup = resolve(backupDir, `shoppingitemcategories-backup-${Date.now()}.json`);
	writeFileSync(backup, JSON.stringify(docs, null, 1));
	console.log(`\nBacked up ${docs.length} docs to ${backup}`);

	// timestamps: false — keep updatedAt meaningful for the heuristic above
	await ShoppingItemCategory.updateMany(
		{ _id: { $in: manual.map((d) => d._id) } },
		{ $set: { source: 'manual' } },
		{ timestamps: false }
	);
	for (const c of CORRECTIONS) {
		const prev = byName.get(c.name);
		await ShoppingItemCategory.updateOne(
			{ normalizedName: c.name },
			{
				$set: {
					category: c.category,
					icon: c.icon ?? prev?.icon ?? null,
					source: 'manual',
					originalName: prev?.originalName ?? c.name
				},
				$unset: { embedding: 1 }
			},
			{ upsert: true }
		);
	}
	const del = await ShoppingItemCategory.deleteMany({ _id: { $in: toDelete.map((d) => d._id) } });
	console.log(`Tagged ${manual.length} manual, applied ${CORRECTIONS.length} corrections, deleted ${del.deletedCount} auto docs`);
}

await mongoose.disconnect();
