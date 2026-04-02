/**
 * Import BLS 4.0 (Bundeslebensmittelschlüssel) nutrition data from CSV.
 * Pre-convert the xlsx to CSV first (one-time):
 *   node -e "const X=require('xlsx');const w=X.readFile('BLS_4_0_2025_DE/BLS_4_0_Daten_2025_DE.xlsx');
 *   require('fs').writeFileSync('BLS_4_0_2025_DE/BLS_4_0_Daten_2025_DE.csv',X.utils.sheet_to_csv(w.Sheets[w.SheetNames[0]]))"
 *
 * Run: pnpm exec vite-node scripts/import-bls-nutrition.ts
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

/** Parse CSV handling quoted fields with commas */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  while (i < text.length) {
    const row: string[] = [];
    while (i < text.length && text[i] !== '\n') {
      if (text[i] === '"') {
        i++; // skip opening quote
        let field = '';
        while (i < text.length) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') { field += '"'; i += 2; }
            else { i++; break; }
          } else { field += text[i]; i++; }
        }
        row.push(field);
        if (text[i] === ',') i++;
      } else {
        const next = text.indexOf(',', i);
        const nl = text.indexOf('\n', i);
        const end = (next === -1 || (nl !== -1 && nl < next)) ? (nl === -1 ? text.length : nl) : next;
        row.push(text.substring(i, end));
        i = end;
        if (text[i] === ',') i++;
      }
    }
    if (text[i] === '\n') i++;
    if (row.length > 0) rows.push(row);
  }
  return rows;
}

const BLS_CSV = resolve('BLS_4_0_2025_DE/BLS_4_0_Daten_2025_DE.csv');
const OUTPUT_FILE = resolve('src/lib/data/blsDb.ts');

// BLS nutrient code → our per100g field name
const NUTRIENT_MAP: Record<string, { field: string; divisor?: number }> = {
  ENERCC: { field: 'calories' },
  PROT625: { field: 'protein' },
  FAT: { field: 'fat' },
  FASAT: { field: 'saturatedFat' },
  CHO: { field: 'carbs' },
  FIBT: { field: 'fiber' },
  SUGAR: { field: 'sugars' },
  CA: { field: 'calcium' },
  FE: { field: 'iron' },
  MG: { field: 'magnesium' },
  P: { field: 'phosphorus' },
  K: { field: 'potassium' },
  NA: { field: 'sodium' },
  ZN: { field: 'zinc' },
  VITA: { field: 'vitaminA' },
  VITC: { field: 'vitaminC' },
  VITD: { field: 'vitaminD' },
  VITE: { field: 'vitaminE' },
  VITK: { field: 'vitaminK' },
  THIA: { field: 'thiamin' },
  RIBF: { field: 'riboflavin' },
  NIA: { field: 'niacin' },
  VITB6: { field: 'vitaminB6', divisor: 1000 }, // BLS: µg → mg
  VITB12: { field: 'vitaminB12' },
  FOL: { field: 'folate' },
  CHORL: { field: 'cholesterol' },
  // Amino acids (all g/100g)
  ILE: { field: 'isoleucine' },
  LEU: { field: 'leucine' },
  LYS: { field: 'lysine' },
  MET: { field: 'methionine' },
  PHE: { field: 'phenylalanine' },
  THR: { field: 'threonine' },
  TRP: { field: 'tryptophan' },
  VAL: { field: 'valine' },
  HIS: { field: 'histidine' },
  ALA: { field: 'alanine' },
  ARG: { field: 'arginine' },
  ASP: { field: 'asparticAcid' },
  CYSTE: { field: 'cysteine' },
  GLU: { field: 'glutamicAcid' },
  GLY: { field: 'glycine' },
  PRO: { field: 'proline' },
  SER: { field: 'serine' },
  TYR: { field: 'tyrosine' },
};

// BLS code first letter → category (BLS 4.0 Hauptgruppen)
const CATEGORY_MAP: Record<string, string> = {
  A: 'Getränke', B: 'Getreideprodukte', C: 'Getreide', D: 'Backwaren',
  E: 'Gemüse', F: 'Obst', G: 'Hülsenfrüchte',
  H: 'Gewürze und Kräuter', J: 'Fette und Öle', K: 'Milch und Milchprodukte',
  L: 'Eier', M: 'Fleisch', N: 'Wurstwaren', O: 'Wild', P: 'Geflügel',
  Q: 'Fisch und Meeresfrüchte', R: 'Süßwaren', S: 'Zucker und Honig',
  T: 'Gerichte und Rezepte', U: 'Pilze', V: 'Sonstiges', W: 'Algen',
  X: 'Fleischersatz', Y: 'Supplemente',
};

async function main() {
  console.log('Reading BLS CSV...');
  const csvText = readFileSync(BLS_CSV, 'utf-8');
  const rows: string[][] = parseCSV(csvText);

  const headers = rows[0];
  console.log(`Headers: ${headers.length} columns, ${rows.length - 1} data rows`);

  // Build column index: BLS nutrient code → column index of the value column
  const codeToCol = new Map<string, number>();
  for (let c = 3; c < headers.length; c += 3) {
    const code = headers[c]?.split(' ')[0];
    if (code) codeToCol.set(code, c);
  }

  const entries: any[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const blsCode = row[0]?.trim();
    const nameDe = row[1]?.trim();
    const nameEn = row[2]?.trim() || '';

    if (!blsCode || !nameDe) continue;

    const category = CATEGORY_MAP[blsCode[0]] || 'Sonstiges';
    const per100g: Record<string, number> = {};

    for (const [blsNutrientCode, mapping] of Object.entries(NUTRIENT_MAP)) {
      const col = codeToCol.get(blsNutrientCode);
      if (col === undefined) {
        per100g[mapping.field] = 0;
        continue;
      }
      let value = parseFloat(row[col] || '0');
      if (isNaN(value)) value = 0;
      if (mapping.divisor) value /= mapping.divisor;
      per100g[mapping.field] = Math.round(value * 1000) / 1000;
    }

    entries.push({ blsCode, nameDe, nameEn, category, per100g });
  }

  console.log(`Parsed ${entries.length} BLS entries`);

  // Sample entries
  const sample = entries.slice(0, 3);
  for (const e of sample) {
    console.log(`  ${e.blsCode} | ${e.nameDe} | ${e.per100g.calories} kcal | protein ${e.per100g.protein}g`);
  }

  const output = `// Auto-generated from BLS 4.0 (Bundeslebensmittelschlüssel)
// Generated: ${new Date().toISOString().split('T')[0]}
// Do not edit manually — regenerate with: pnpm exec vite-node scripts/import-bls-nutrition.ts

import type { NutritionPer100g } from '$types/types';

export type BlsEntry = {
  blsCode: string;
  nameDe: string;
  nameEn: string;
  category: string;
  per100g: NutritionPer100g;
};

export const BLS_DB: BlsEntry[] = ${JSON.stringify(entries, null, 0)};
`;

  writeFileSync(OUTPUT_FILE, output, 'utf-8');
  console.log(`Written ${OUTPUT_FILE} (${(output.length / 1024 / 1024).toFixed(1)}MB, ${entries.length} entries)`);
}

main().catch(console.error);
