/**
 * Tiny frontmatter parser (no deps) for the hike `index.svx` files, shared by
 * build-hikes and generate-hike-alt-text. The schema is small, so it supports
 * only what it uses: strings, numbers, booleans, ISO dates (kept as strings),
 * and bracketed arrays of strings: `[a, b, "c d"]`. Trailing ` # comments` and
 * comment lines are ignored.
 */

export type FrontmatterValue = string | number | boolean | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

/**
 * Split a `---`-fenced frontmatter block off `source`. Without one, `data` is
 * empty and `body` is the whole source.
 */
export function parseFrontmatter(source: string): { data: Frontmatter; body: string } {
	const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
	if (!match) return { data: {}, body: source };

	const data: Frontmatter = {};
	for (const rawLine of match[1].split(/\r?\n/)) {
		const line = rawLine.replace(/\s+#.*$/, '').trim();
		if (!line || line.startsWith('#')) continue;
		const sep = line.indexOf(':');
		if (sep < 0) continue;
		const key = line.slice(0, sep).trim();
		const raw = line.slice(sep + 1).trim();
		data[key] = parseScalar(raw);
	}
	return { data, body: match[2] };
}

export function parseScalar(raw: string): FrontmatterValue {
	if (raw === '') return '';
	if (raw === 'true') return true;
	if (raw === 'false') return false;
	if (raw.startsWith('[') && raw.endsWith(']')) {
		return raw
			.slice(1, -1)
			.split(',')
			.map((s) => stripQuotes(s.trim()))
			.filter((s) => s.length > 0);
	}
	if (/^-?\d+(\.\d+)?$/.test(raw)) return parseFloat(raw);
	return stripQuotes(raw);
}

export function stripQuotes(s: string): string {
	if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
		return s.slice(1, -1);
	}
	return s;
}
