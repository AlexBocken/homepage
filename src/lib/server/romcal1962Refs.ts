import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { splitCompoundRef } from './properBibleFallback';

type Block =
	| { type: 'text'; slot?: number; role?: string }
	| { type: 'scriptureRef'; ref: string }
	| { type: 'directive'; value: string }
	| { type: 'rubric'; note: string }
	| { type: 'ref'; target: string }
	| { type: 'separator' };

type Entry = Record<string, Block[]>;

const require = createRequire(import.meta.url);

function loadStructure(name: 'tempora' | 'sancti' | 'commune'): Record<string, Entry> {
	try {
		const pkgEntry = require.resolve('romcal/1962');
		const baseIdx = pkgEntry.indexOf('/rites/roman1962/');
		if (baseIdx < 0) return {};
		const dataPath =
			pkgEntry.slice(0, baseIdx) +
			`/rites/roman1962/data/propers/_structure/${name}.json`;
		return JSON.parse(readFileSync(dataPath, 'utf-8')) as Record<string, Entry>;
	} catch {
		return {};
	}
}

const structures: Record<'tempora' | 'sancti' | 'commune', Record<string, Entry>> = {
	tempora: loadStructure('tempora'),
	sancti: loadStructure('sancti'),
	commune: loadStructure('commune')
};

export function getProperRefs(
	kind: string | null | undefined,
	key: string,
	section: string
): string[] {
	if (!kind) return [];
	const entry = structures[kind as keyof typeof structures]?.[key];
	if (!entry) return [];
	const blocks = entry[section];
	if (!blocks) return [];
	const refs: string[] = [];
	for (const b of blocks) {
		if (b.type === 'scriptureRef' && b.ref) refs.push(b.ref);
	}
	return refs;
}

// Distribute scripture refs across Latin text slots so Bible fallback aligns
// row-for-row with the Latin. Each scriptureRef block applies to the text
// slots that follow it (up to the next scriptureRef). When a compound ref
// like "Ps. 117:24; 117:1" has the same number of segments as following
// slots, segments map 1-to-1. Otherwise all segments collapse into the first
// following slot so multi-verse antiphons stay intact.
export function getProperRefsPerSlot(
	kind: string | null | undefined,
	key: string,
	section: string,
	slotCount: number
): string[][] {
	const perSlot: string[][] = Array.from({ length: slotCount }, () => []);
	if (!kind || slotCount <= 0) return perSlot;
	const entry = structures[kind as keyof typeof structures]?.[key];
	if (!entry) return perSlot;
	const blocks = entry[section];
	if (!blocks) return perSlot;

	let i = 0;
	while (i < blocks.length) {
		const b = blocks[i];
		if (b.type !== 'scriptureRef' || !b.ref) {
			i++;
			continue;
		}
		const segs = splitCompoundRef(b.ref);
		const slotIdxs: number[] = [];
		let j = i + 1;
		while (j < blocks.length && blocks[j].type !== 'scriptureRef') {
			const nb = blocks[j];
			if (nb.type === 'text' && typeof nb.slot === 'number') slotIdxs.push(nb.slot);
			j++;
		}
		if (slotIdxs.length > 0) {
			if (segs.length === slotIdxs.length) {
				for (let k = 0; k < segs.length; k++) {
					const s = slotIdxs[k];
					if (s >= 0 && s < slotCount) perSlot[s].push(segs[k]);
				}
			} else {
				const first = slotIdxs[0];
				if (first >= 0 && first < slotCount) perSlot[first].push(...segs);
			}
		}
		i = j;
	}
	return perSlot;
}
