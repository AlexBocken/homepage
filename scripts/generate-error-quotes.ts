/**
 * Build-time generation of bilingual Bible quotes per HTTP error status.
 *
 * Looks up curated references in static/allioli.tsv (DE) + static/drb.tsv (EN)
 * via the existing bible reference parser, then writes the resolved verses to
 * src/lib/data/errorQuotes.json for the prerendered /errors/[status] pages.
 *
 *   - Add or change a status by editing REFS below.
 *   - Refs use the abbreviations defined in the TSVs (e.g. Mt 7,7 / Mt 7:7).
 *   - Fails the build if any reference cannot be resolved.
 *
 * Run: pnpm exec vite-node scripts/generate-error-quotes.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookupReference } from '../src/lib/server/bible';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const ALLIOLI = join(ROOT, 'static/allioli.tsv');
const DRB = join(ROOT, 'static/drb.tsv');
const OUT = join(ROOT, 'src/lib/data/errorQuotes.json');

// Curated refs. Abbreviations must match the TSV's `abbreviation` column.
const REFS: Record<number, { de: string; en: string }> = {
  401: { de: 'Mt 7,7',     en: 'Mt 7:7' },
  403: { de: 'Mt 7,14',    en: 'Mt 7:14' },
  404: { de: 'Mt 7,8',     en: 'Mt 7:8' },
  500: { de: '2Kor 4,7',   en: '2Cor 4:7' },
  502: { de: '1Mo 11,9',   en: 'Gn 11:9' },
  503: { de: 'Ps 37,7',    en: 'Ps 37:7' },
  504: { de: 'Jes 40,31',  en: 'Is 40:31' }
};

type ResolvedQuote = { text: string; reference: string };

function resolveOne(ref: string, tsv: string): ResolvedQuote {
  const result = lookupReference(ref, tsv);
  if (!result || result.verses.length === 0) {
    throw new Error(`could not resolve reference "${ref}" in ${tsv}`);
  }
  // Range refs join verses with a space. Display reference reuses the
  // original input so the UI keeps the canonical "Mt 7,7" / "Mt 7:7" form.
  const text = result.verses.map((v) => v.text).join(' ');
  return { text, reference: ref };
}

const out: Record<string, { de: ResolvedQuote; en: ResolvedQuote }> = {};
for (const [status, refs] of Object.entries(REFS)) {
  out[status] = {
    de: resolveOne(refs.de, ALLIOLI),
    en: resolveOne(refs.en, DRB)
  };
  console.log(`[error-quotes] ${status}: ${refs.de} / ${refs.en}`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`[error-quotes] wrote ${OUT.replace(ROOT + '/', '')} (${Object.keys(out).length} statuses)`);
