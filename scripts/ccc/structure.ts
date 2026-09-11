/**
 * The Catechism's skeleton, taken once from the German stream (the only source
 * that marks its hierarchy up as headings) and then used for all three
 * languages, because every edition numbers its paragraphs identically.
 *
 * A *section* is the deepest structural node that owns a run of paragraphs —
 * usually an article, sometimes a chapter's own introduction, sometimes one
 * "Absatz" inside an article. Its id spells out the path in the Latin edition's
 * convention (`p2s2c1a3`, `p1s2c1a1p2`), which is stable, language-neutral and
 * short enough to live in a URL.
 */
import type { CccLang, CccNode, CccStructure } from '../../src/lib/faith/cccTypes';
import type { RawItem } from './stream';

const LEVEL_PREFIX = ['', '', 's', 'c', 'a', 'p'];

/** The four parts get p1…p4; the front matter keeps a name. */
function partId(text: string, seen: number): string {
	if (/FIDEI DEPOSITUM/i.test(text)) return 'fidei-depositum';
	if (/^PROLOG/i.test(text)) return 'prologus';
	return `p${seen}`;
}

type Building = CccNode & { children: Building[] };

export function buildStructure(german: RawItem[]): { structure: CccStructure; titles: Map<string, string> } {
	const tree: Building[] = [];
	const stack: Building[] = [];
	const counters = new Map<string, number>();
	let parts = 0;

	const ranges = new Map<string, [number, number]>();
	const order: string[] = [];
	const sectionOf: Record<string, string> = {};
	const titles = new Map<string, string>();

	const node = (level: number, text: string): Building => {
		while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
		const parent = stack[stack.length - 1] ?? null;
		let id: string;
		if (level === 1) {
			if (!/FIDEI DEPOSITUM/i.test(text) && !/^PROLOG/i.test(text)) parts++;
			id = partId(text, parts);
		} else {
			const key = `${parent?.id ?? ''}/${level}`;
			const k = (counters.get(key) ?? 0) + 1;
			counters.set(key, k);
			id = `${parent?.id ?? ''}${LEVEL_PREFIX[Math.min(level, 5)]}${k}`;
		}
		const made: Building = { id, level, title: { de: text, en: '', la: '' } as Record<CccLang, string>, children: [], range: null };
		if (parent) parent.children.push(made);
		else tree.push(made);
		stack.push(made);
		titles.set(id, text);
		return made;
	};

	for (const item of german) {
		if (item.k === 'h') {
			// Level 6 is a subheading inside a section, not a section of its own.
			if (item.level <= 5) node(item.level, item.text);
			continue;
		}
		if (item.k !== 'p') continue;
		const owner = stack[stack.length - 1];
		if (!owner) throw new Error(`[ccc] paragraph ${item.n} before any heading`);
		sectionOf[item.n] = owner.id;
		const range = ranges.get(owner.id);
		if (range) range[1] = Math.max(range[1], item.n);
		else {
			ranges.set(owner.id, [item.n, item.n]);
			order.push(owner.id);
		}
	}

	for (const [id, range] of ranges) {
		const find = (nodes: Building[]): Building | null => {
			for (const n of nodes) {
				if (n.id === id) return n;
				const hit = find(n.children);
				if (hit) return hit;
			}
			return null;
		};
		const owner = find(tree);
		if (owner) owner.range = range;
	}

	return {
		structure: { tree, sectionOf, order, ranges: Object.fromEntries(ranges) },
		titles
	};
}
