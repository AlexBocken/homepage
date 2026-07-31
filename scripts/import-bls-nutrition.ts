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
import { toSwissGerman } from '../src/lib/data/helvetisms';
// Read for the caffeine equivalences below — see CAFFEINE_FROM_USDA. Requires the
// USDA importer to have generated its table first.
import { NUTRITION_DB } from '../src/lib/data/nutritionDb';

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
  // VITAA, not VITA: BLS publishes both the older Retinol-Äquivalent (RE) and the
  // Retinol-Aktivitäts-Äquivalent (RAE) that USDA reports. RAE counts carotenoids
  // at half to a twelfth of RE, so importing RE here while USDA supplied RAE meant
  // the two sources were being added together on different scales.
  VITAA: { field: 'vitaminA' },
  // The preformed share, kept apart because the upper intake level applies to it
  // alone — see UPPER_LIMITS in $lib/data/dailyReferenceIntake.
  RETOL: { field: 'retinol' },
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
  PANTAC: { field: 'pantothenicAcid' },
  STARCH: { field: 'starch' },
  FRUS: { field: 'fructose' },
  LACS: { field: 'lactose' },
  // The two energy sources that are neither macro nor alcohol. Written for every
  // food for the same reason ALC is: BLS determines them throughout, and the
  // energy attribution in $lib/fitness/nutritionMath needs a number, not a gap.
  POLYL: { field: 'sugarAlcohols' },
  OA: { field: 'organicAcids' },
  // Ethanol. Belongs with the panel BLS determines for every food rather than with
  // the sparse maps below: a 0 here is a measurement, not a guess. Writing it for
  // every row also keeps one object shape across the generated array — TypeScript
  // gives up on assignability ("union type too complex to represent") when a 7000-
  // element literal carries two different key sets.
  ALC: { field: 'alcohol' },
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

// Trace minerals, kept apart from NUTRIENT_MAP for the same reason the fatty acids
// are: BLS leaves a cell '-' where nothing was determined, and forcing that to 0
// would claim a food contains no iodine when nobody looked. Coverage runs 81%
// (molybdenum) to 99% (copper, manganese). BLS 4.0 has no selenium column at all —
// that key comes from USDA only, and BLS-sourced foods leave it absent.
//
// Copper and manganese are published in µg but stored in mg, so they line up with
// the other minerals in NutritionPer100g and with their reference values.
const TRACE_MINERAL_MAP: Record<string, { field: string; divisor?: number }> = {
  CU: { field: 'copper', divisor: 1000 },    // BLS: µg → mg
  MN: { field: 'manganese', divisor: 1000 }, // BLS: µg → mg
  ID: { field: 'iodine' },
  CR: { field: 'chromium' },
  MO: { field: 'molybdenum' },
};

// Biotin (mcg). Written under the same '-' rule as the trace minerals rather than
// with the vitamins above, because its coverage splits hard by source — BLS has it
// for 94% of its foods, USDA for 13% of the imported ones — so an absent key has to
// keep meaning "nobody measured this" rather than "none present".
const SPARSE_MAP: Record<string, { field: string; divisor?: number }> = {
  BIOT: { field: 'biotin' },
};

// Fatty acids (g/100 g), kept apart from NUTRIENT_MAP because they are written only
// where the food reports them. The map above forces 0 for anything missing, which is
// right for a panel BLS measures throughout, but a fabricated 0 for EPA would be
// indistinguishable from a real one and would bias the omega-3 sum derived in
// $lib/fitness/fattyAcids.
//
// BLS 4.0 dropped the old F160/FO3 codes for EuroFIR tags (BLS_4_0_Dokumentation_DE,
// ch. "Fettsäuren"). FAPUN3/FAPUN6 exist in the source but are deliberately not
// imported: we hold the individual acids, so the totals are derived on read and
// cannot drift out of step with the acids they claim to sum.
// BLS 4.0 publishes no trans fat total — the only trans figure in the file is the
// conjugated linoleic acid isomer F18:2C9T11, which is not the same thing and is not
// what the 1%-of-energy ceiling refers to. Trans fat therefore comes only from USDA
// and Open Food Facts, and BLS-sourced foods leave the key absent rather than zero.
const FATTY_ACID_MAP: Record<string, string> = {
  FAMS: 'monounsaturatedFat',
  FAPU: 'polyunsaturatedFat',
  'F18:2CN6': 'linoleicAcid',
  'F18:3CN3': 'alphaLinolenicAcid',
  'F18:3CN6': 'gammaLinolenicAcid',
  'F20:4CN6': 'arachidonicAcid',
  'F20:5CN3': 'epa',
  'F22:5CN3': 'dpa',
  'F22:6CN3': 'dha',
  // Minor members of both families. BLS fills these for every food, so including
  // them makes the derived omega-3/omega-6 totals exact rather than approximate.
  'F18:4CN3': 'stearidonicAcid',
  'F20:2CN6': 'eicosadienoicAcid',
  'F20:3CN6': 'dihomoGammaLinolenicAcid',
};

/**
 * Caffeine, borrowed from USDA per food.
 *
 * BLS 4.0 has no caffeine column at all — not for coffee, not for tea, not for
 * cola — so anything logged from it read as caffeine-free, which for a cup of
 * coffee is worse than showing nothing. USDA measures it for 4,990 foods.
 *
 * Each entry is an explicit equivalence to a USDA record, and the figure is read
 * out of the generated USDA table at import time rather than written here, so it
 * stays traceable to a source and follows a USDA re-import. That does mean the
 * USDA importer has to have run first; a missing id is reported loudly below
 * rather than silently dropping the food back to no caffeine.
 *
 * Deliberately narrow. Only foods whose USDA counterpart is unambiguous are
 * listed: brewed and instant coffee by preparation, tea by leaf and decaffeination,
 * cola by whether it is a caffeinated formula, and chocolate by cocoa content —
 * the two axes both databases name. Chicory and cereal 'coffee', rooibos and maté
 * are left absent rather than approximated, and so is every composite (chocolate
 * ice cream, cocoa biscuits) whose caffeine depends on a recipe neither table
 * states.
 */
const CAFFEINE_FROM_USDA: Record<string, number> = {
  // Coffee
  N410100: 171890, // Kaffee (Getränk) ← coffee, brewed, prepared with tap water
  N411100: 171891, // Espresso ← coffee, brewed, espresso, restaurant-prepared
  N415000: 171889, // Kaffee entkoffeiniert ← coffee, brewed, decaffeinated
  N420100: 174130, // Kaffee aus Instantpulver ← coffee, instant, regular, prepared
  N420900: 171893, // Instantkaffeepulver ← coffee, instant, regular, powder
  N440100: 171894, // Instantkaffee entkoffeiniert ← instant, decaffeinated, prepared
  N440900: 174133, // Instantkaffeepulver entkoffeiniert ← instant, decaffeinated, powder
  // Tea
  N630000: 173227, // Schwarztee ← tea, black, brewed, prepared with tap water
  N670100: 174871, // Schwarztee entkoffeiniert ← tea, black, brewed, decaffeinated
  N610100: 171917, // Grüntee ← tea, green, brewed, regular
  N019000: 171888, // Eistee gesüsst ← tea, black, ready-to-drink, lemon, sweetened
  // Cola. The sweetener differs between these and their USDA counterparts; the
  // caffeine does not, which is the only figure taken.
  N330000: 174852, // Colagetränk koffeinhaltig ← carbonated, cola, regular
  N331000: 174852, // dito, mit Süssungsmitteln
  N340000: 174851, // Colagetränk koffeinfrei ← carbonated, cola, without caffeine
  N352000: 174851, // dito, mit Süssungsmitteln
  // Chocolate, matched on cocoa content — the axis both tables name
  S530000: 167587, // Milchschokolade ← candies, milk chocolate
  S539900: 167587, // Vollmilchschokolade ← dito
  S580000: 167571, // Schokolade weiss ← candies, white chocolate (no cocoa solids)
  S560000: 170271, // Zartbitter-/Halbbitterschokolade ← dark, 45-59% cacao solids
  S570000: 170273, // Bitterschokolade ← dark, 70-85% cacao solids
};

/**
 * Milk-coffee drinks, where the caffeine is *estimated* rather than borrowed.
 *
 * These have no counterpart in either table: USDA lists no cappuccino, no latte
 * macchiato and no Turkish coffee, and BLS states no coffee fraction for its own.
 * What they do have in common is a serving built around a shot, so each is
 * expressed as `strengthMl` of a coffee whose strength USDA *does* measure, served
 * in `servingMl`:
 *
 *     mg per 100 ml of drink = source caffeine per 100 ml × strengthMl ÷ servingMl
 *
 * Both numbers are an assumption about how the drink is made, not a measurement —
 * a double-shot cappuccino carries twice what this says. They are stated per drink
 * so the arithmetic can be argued with, and the strength always comes from a real
 * USDA record so only the recipe is ours.
 *
 * The instant cappuccino *powder* (N503900) is deliberately absent: it is not a
 * serving, and how much of a cup a spoonful makes is not something to invent.
 */
type CaffeineEstimate = {
  /** USDA record the coffee's strength is taken from. */
  fdcId: number;
  /** Millilitres of that coffee assumed per serving. */
  strengthMl: number;
  /** Size of the served drink, in millilitres. */
  servingMl: number;
  why: string;
};

/** A single espresso, the shot every drink below is built from. */
const ESPRESSO_SHOT_ML = 30;
const ESPRESSO_FDC_ID = 171891; // coffee, brewed, espresso, restaurant-prepared

const CAFFEINE_ESTIMATED: Record<string, CaffeineEstimate> = {
  N414000: { fdcId: ESPRESSO_FDC_ID, strengthMl: ESPRESSO_SHOT_ML, servingMl: 150,
    why: 'one shot in a 150 ml cappuccino' },
  N4A3300: { fdcId: ESPRESSO_FDC_ID, strengthMl: ESPRESSO_SHOT_ML, servingMl: 150,
    why: 'one shot in a 150 ml cappuccino; the sugar changes nothing' },
  N418000: { fdcId: ESPRESSO_FDC_ID, strengthMl: ESPRESSO_SHOT_ML, servingMl: 250,
    why: 'one shot in a 250 ml latte macchiato — the same coffee, more milk' },
  N419000: { fdcId: ESPRESSO_FDC_ID, strengthMl: ESPRESSO_SHOT_ML, servingMl: 70,
    why: 'a 70 ml Turkish cup brewed from about a shot’s worth of grounds' },
  N412900: { fdcId: ESPRESSO_FDC_ID, strengthMl: ESPRESSO_SHOT_ML / 2, servingMl: 150,
    why: 'an instant cappuccino sachet carries roughly half a shot of coffee' },
  Y997043: { fdcId: 171890, strengthMl: 150, servingMl: 250,
    why: 'a 150 ml cup of filter coffee over ice cream, served as 250 g' },
};

// BLS 4.0 code first letter → category (Hauptlebensmittelgruppen)
const CATEGORY_MAP: Record<string, string> = {
  B: 'Brot & Backwaren', C: 'Getreide', D: 'Dauerbackwaren & Kekse',
  E: 'Teigwaren & Nudeln', F: 'Obst & Früchte', G: 'Gemüse',
  H: 'Hülsenfrüchte & Sojaprodukte', K: 'Kartoffeln & Stärke',
  M: 'Milch & Milchprodukte', N: 'Getränke (alkoholfrei)',
  P: 'Alkoholische Getränke', Q: 'Fette & Öle',
  R: 'Gewürze & Würzmittel', S: 'Zucker & Honig',
  T: 'Fisch & Meeresfrüchte', U: 'Fleisch',
  V: 'Wild & Kaninchen', W: 'Wurstwaren',
  X: 'Brühen & Fertiggerichte', Y: 'Gerichte & Rezepte',
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

  // The fatty acid tags come from the BLS 4.0 documentation rather than from a
  // column we have seen, so say plainly which ones this file actually carries.
  // A tag listed as missing means the mapping needs correcting, not that the data
  // is absent.
  const faFound = Object.keys(FATTY_ACID_MAP).filter(code => codeToCol.has(code));
  const faMissing = Object.keys(FATTY_ACID_MAP).filter(code => !codeToCol.has(code));
  console.log(`Fatty acid columns matched: ${faFound.length}/${Object.keys(FATTY_ACID_MAP).length}`);
  if (faMissing.length) {
    console.warn(`  NOT FOUND in CSV: ${faMissing.join(', ')}`);
    const faLike = [...codeToCol.keys()].filter(c => /^(FA|F\d)/.test(c) && !(c in FATTY_ACID_MAP));
    if (faLike.length) console.warn(`  Unmapped fatty-acid-looking columns present: ${faLike.join(', ')}`);
  }

  const tmMissing = [...Object.keys(TRACE_MINERAL_MAP), ...Object.keys(SPARSE_MAP)].filter(code => !codeToCol.has(code));
  if (tmMissing.length) console.warn(`Trace mineral columns NOT FOUND in CSV: ${tmMissing.join(', ')}`);

  // Resolve every caffeine equivalence up front, so a stale fdcId is one loud
  // warning rather than a food that quietly loses its caffeine again.
  const caffeineByBlsCode = new Map<string, number>();
  {
    const byFdcId = new Map(NUTRITION_DB.map(e => [e.fdcId, e]));
    for (const [blsCode, fdcId] of Object.entries(CAFFEINE_FROM_USDA)) {
      const usda = byFdcId.get(fdcId);
      const mg = usda?.per100g?.caffeine;
      if (typeof mg !== 'number') {
        console.warn(`Caffeine equivalence ${blsCode} → fdcId ${fdcId}: ${usda ? 'no caffeine figure' : 'no such USDA food'} — leaving it absent`);
        continue;
      }
      caffeineByBlsCode.set(blsCode, mg);
    }
    console.log(`Caffeine borrowed from USDA for ${caffeineByBlsCode.size}/${Object.keys(CAFFEINE_FROM_USDA).length} mapped foods`);

    // Milk-coffee drinks, estimated from a stated serving — see CAFFEINE_ESTIMATED.
    for (const [blsCode, est] of Object.entries(CAFFEINE_ESTIMATED)) {
      const source = byFdcId.get(est.fdcId);
      const per100 = source?.per100g?.caffeine;
      if (typeof per100 !== 'number') {
        console.warn(`Caffeine estimate ${blsCode}: source fdcId ${est.fdcId} has no caffeine figure — leaving it absent`);
        continue;
      }
      const mg = (per100 * est.strengthMl) / est.servingMl;
      caffeineByBlsCode.set(blsCode, Math.round(mg * 10) / 10);
      console.log(`  estimated ${blsCode}: ${Math.round(mg * 10) / 10} mg/100 ml — ${est.why}`);
    }
  }

  const entries: any[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const blsCode = row[0]?.trim();
    // BLS is a German database; this site writes Swiss High German. Normalising here
    // rather than in the generated file means a re-import cannot bring back Sahne,
    // Hähnchen and the eszett.
    const nameDe = toSwissGerman(row[1]?.trim() ?? '');
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

    // BLS distinguishes three kinds of non-numeric cell, and they do not mean the
    // same thing. '-' is "not determined" and must leave the key absent, so the
    // omega sums derived on read skip it rather than counting it as none present.
    // 'TR' (Spuren) and '<LOD or <LOQ' are measurements — the lab looked and found
    // at most traces — so those record a real zero.
    for (const [blsNutrientCode, field] of Object.entries(FATTY_ACID_MAP)) {
      const col = codeToCol.get(blsNutrientCode);
      if (col === undefined) continue;
      const raw = row[col]?.trim();
      if (!raw || raw === '-') continue;
      if (raw === 'TR' || raw.startsWith('<LOD') || raw.startsWith('<LOQ')) {
        per100g[field] = 0;
        continue;
      }
      const value = parseFloat(raw);
      if (isNaN(value)) continue;
      per100g[field] = Math.round(value * 1000) / 1000;
    }

    // Trace minerals and biotin follow the same rule: '-' leaves the key absent, TR
    // and a below-detection result are measurements and record a zero.
    for (const [blsNutrientCode, mapping] of Object.entries({ ...TRACE_MINERAL_MAP, ...SPARSE_MAP })) {
      const col = codeToCol.get(blsNutrientCode);
      if (col === undefined) continue;
      const raw = row[col]?.trim();
      if (!raw || raw === '-') continue;
      if (raw === 'TR' || raw.startsWith('<LOD') || raw.startsWith('<LOQ')) {
        per100g[mapping.field] = 0;
        continue;
      }
      let value = parseFloat(raw);
      if (isNaN(value)) continue;
      if (mapping.divisor) value /= mapping.divisor;
      // Three decimals on a mg field is 1 µg of resolution, which is finer than the
      // µg figures BLS publishes for copper and manganese in the first place.
      per100g[mapping.field] = Math.round(value * 1000) / 1000;
    }

    // Caffeine is not in the CSV at all — see CAFFEINE_FROM_USDA. Written only for
    // the mapped foods, so an absent key still means "no figure", not "none".
    const caffeine = caffeineByBlsCode.get(blsCode);
    if (typeof caffeine === 'number') per100g.caffeine = caffeine;

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
