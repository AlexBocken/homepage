/**
 * Downloads all Bring! shopping list item icons locally.
 * Icons are stored at static/shopping-icons/{key}.png
 *
 * Run: pnpm exec vite-node scripts/download-bring-icons.ts
 */
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const CATALOG_URL = 'https://web.getbring.com/locale/articles.de-DE.json';
const ICON_BASE = 'https://web.getbring.com/assets/images/items/';
const OUTPUT_DIR = resolve('static/shopping-icons');

/** Normalize key to icon filename (matches Bring's normalizeStringPath) */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/é/g, 'e')
    .replace(/è/g, 'e')
    .replace(/ê/g, 'e')
    .replace(/à/g, 'a')
    .replace(/!/g, '')
    .replace(/[\s\-]+/g, '_');
}

async function main() {
  console.log('Fetching catalog...');
  const res = await fetch(CATALOG_URL);
  const catalog: Record<string, string> = await res.json();

  // Filter out category headers and meta entries
  const SKIP = [
    'Früchte & Gemüse', 'Fleisch & Fisch', 'Milch & Käse', 'Brot & Gebäck',
    'Getreideprodukte', 'Snacks & Süsswaren', 'Getränke & Tabak', 'Getränke',
    'Haushalt & Gesundheit', 'Fertig- & Tiefkühlprodukte', 'Zutaten & Gewürze',
    'Baumarkt & Garten', 'Tierbedarf', 'Eigene Artikel', 'Zuletzt verwendet',
    'Bring!', 'Vielen Dank', 'Früchte', 'Fleisch', 'Gemüse',
  ];

  const items = Object.keys(catalog).filter(k => !SKIP.includes(k));
  console.log(`Found ${items.length} items to download`);

  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Also download letter fallbacks a-z
  const allKeys = [
    ...items.map(k => ({ original: k, normalized: normalizeKey(k) })),
    ...'abcdefghijklmnopqrstuvwxyz'.split('').map(l => ({ original: l, normalized: l })),
  ];

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const { original, normalized } of allKeys) {
    const outPath = resolve(OUTPUT_DIR, `${normalized}.png`);

    if (existsSync(outPath)) {
      skipped++;
      continue;
    }

    const url = `${ICON_BASE}${normalized}.png`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        writeFileSync(outPath, buffer);
        downloaded++;
      } else {
        console.warn(`  ✗ ${original} (${normalized}.png) → ${res.status}`);
        failed++;
      }
    } catch (err) {
      console.warn(`  ✗ ${original} (${normalized}.png) → ${err}`);
      failed++;
    }

    // Rate limiting
    if ((downloaded + skipped + failed) % 50 === 0) {
      console.log(`  ${downloaded + skipped + failed}/${allKeys.length} (${downloaded} new, ${skipped} cached, ${failed} failed)`);
    }
  }

  // Save the catalog mapping (key → normalized filename) for runtime lookup
  const mapping: Record<string, string> = {};
  for (const item of items) {
    mapping[item.toLowerCase()] = normalizeKey(item);
  }
  // Also add the display names as lookups
  for (const [key, displayName] of Object.entries(catalog)) {
    if (!SKIP.includes(key)) {
      mapping[displayName.toLowerCase()] = normalizeKey(key);
    }
  }

  const mappingPath = resolve(OUTPUT_DIR, 'catalog.json');
  writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

  console.log(`\nDone: ${downloaded} downloaded, ${skipped} cached, ${failed} failed`);
  console.log(`Catalog: ${Object.keys(mapping).length} entries → ${mappingPath}`);
}

main().catch(console.error);
