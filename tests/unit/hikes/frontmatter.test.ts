import { describe, it, expect } from 'vitest';
import { parseFrontmatter, parseScalar, stripQuotes } from '../../../scripts/lib/frontmatter';
import { runWithConcurrency, shortHash, pathExists } from '../../../scripts/lib/fsUtil';

describe('parseFrontmatter', () => {
	it('splits the fenced block from the body', () => {
		const src = '---\ntitle: Säntis\ndistance: 12.5\n---\n\nBody text\n---\nnot frontmatter\n';
		const { data, body } = parseFrontmatter(src);
		expect(data).toEqual({ title: 'Säntis', distance: 12.5 });
		expect(body).toBe('\nBody text\n---\nnot frontmatter\n');
	});

	it('handles CRLF line endings', () => {
		const { data, body } = parseFrontmatter('---\r\na: 1\r\nb: two\r\n---\r\nrest');
		expect(data).toEqual({ a: 1, b: 'two' });
		expect(body).toBe('rest');
	});

	it('returns the whole source as body without a frontmatter fence', () => {
		const src = 'title: nope\n';
		expect(parseFrontmatter(src)).toEqual({ data: {}, body: src });
	});

	it('skips comments, blank lines and lines without a colon', () => {
		const src = [
			'---',
			'# a comment line',
			'',
			'title: Hoher Kasten # trailing comment',
			'just some words',
			'hidden: true',
			'---',
			''
		].join('\n');
		expect(parseFrontmatter(src).data).toEqual({ title: 'Hoher Kasten', hidden: true });
	});

	it('splits on the first colon only, so times and URLs survive', () => {
		const src = '---\nstart: "08:30"\nurl: https://example.org/x\n---\n';
		expect(parseFrontmatter(src).data).toEqual({ start: '08:30', url: 'https://example.org/x' });
	});

	it('keeps ISO dates as strings', () => {
		expect(parseFrontmatter('---\ndate: 2026-09-26\n---\n').data).toEqual({ date: '2026-09-26' });
	});

	it('takes the first closing fence', () => {
		const { data, body } = parseFrontmatter('---\na: 1\n---\nb: 2\n---\n');
		expect(data).toEqual({ a: 1 });
		expect(body).toBe('b: 2\n---\n');
	});
});

describe('parseScalar', () => {
	it('parses booleans, numbers and the empty string', () => {
		expect(parseScalar('')).toBe('');
		expect(parseScalar('true')).toBe(true);
		expect(parseScalar('false')).toBe(false);
		expect(parseScalar('42')).toBe(42);
		expect(parseScalar('-3.5')).toBe(-3.5);
	});

	it('leaves number-like strings that are not plain decimals alone', () => {
		expect(parseScalar('1e3')).toBe('1e3');
		expect(parseScalar('.5')).toBe('.5');
		expect(parseScalar('T3')).toBe('T3');
		expect(parseScalar('"42"')).toBe('42');
	});

	it('parses bracketed arrays of (optionally quoted) strings, dropping empties', () => {
		expect(parseScalar('[a, b, "c d", \'e\']')).toEqual(['a', 'b', 'c d', 'e']);
		expect(parseScalar('[]')).toEqual([]);
		expect(parseScalar('[a, , b,]')).toEqual(['a', 'b']);
		// Array items stay strings, even numeric ones.
		expect(parseScalar('[1, 2]')).toEqual(['1', '2']);
	});
});

describe('stripQuotes', () => {
	it('strips one matching pair of quotes only', () => {
		expect(stripQuotes('"x"')).toBe('x');
		expect(stripQuotes("'x'")).toBe('x');
		expect(stripQuotes('"x\'')).toBe('"x\'');
		expect(stripQuotes('x')).toBe('x');
		expect(stripQuotes('""')).toBe('');
	});
});

describe('shortHash', () => {
	it('is the first 8 hex digits of SHA-256, strings hashed as UTF-8', () => {
		// sha256("abc") = ba7816bf…
		expect(shortHash('abc')).toBe('ba7816bf');
		expect(shortHash(Buffer.from('abc'))).toBe('ba7816bf');
	});
});

describe('runWithConcurrency', () => {
	it('keeps input order and never exceeds the limit', async () => {
		let inFlight = 0;
		let peak = 0;
		const out = await runWithConcurrency([30, 5, 20, 1, 10], 2, async (ms, i) => {
			inFlight++;
			peak = Math.max(peak, inFlight);
			await new Promise((r) => setTimeout(r, ms));
			inFlight--;
			return `${i}:${ms}`;
		});
		expect(out).toEqual(['0:30', '1:5', '2:20', '3:1', '4:10']);
		expect(peak).toBe(2);
	});

	it('handles an empty list', async () => {
		expect(await runWithConcurrency([], 4, async () => 1)).toEqual([]);
	});
});

describe('pathExists', () => {
	it('reports existing and missing paths without throwing', async () => {
		expect(await pathExists('package.json')).toBe(true);
		expect(await pathExists('definitely/not/here.txt')).toBe(false);
	});
});
