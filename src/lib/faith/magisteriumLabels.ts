/**
 * What a document and its author are called, in whichever language is being
 * read. The kind and the author are stored as keys rather than as words, so
 * that one import feeds three readers.
 */
import type { m } from '$lib/js/faithI18n';
import type { MagisteriumAuthor, MagisteriumKind } from './magisteriumTypes';

type Table = (typeof m)[keyof typeof m];

export const kindLabel = (t: Table, kind: MagisteriumKind): string =>
	kind === 'encyclical'
		? t.magisterium_encyclical
		: kind === 'exhortation'
			? t.magisterium_exhortation
			: kind === 'constitution'
				? t.magisterium_constitution
				: kind === 'letter'
					? t.magisterium_letter
					: kind === 'declaration'
						? t.magisterium_declaration
						: t.magisterium_instruction;

export const authorLabel = (t: Table, author: MagisteriumAuthor): string =>
	({
		'leo-xiii': t.magisterium_author_leo_xiii,
		'pius-xi': t.magisterium_author_pius_xi,
		'pius-xii': t.magisterium_author_pius_xii,
		'john-xxiii': t.magisterium_author_john_xxiii,
		'paul-vi': t.magisterium_author_paul_vi,
		'john-paul-ii': t.magisterium_author_john_paul_ii,
		cdf: t.magisterium_author_cdf,
		'vatican-i': t.magisterium_author_vatican_i
	})[author];

/** The order the index shows them in: as the Church issued them. */
export const AUTHORS: MagisteriumAuthor[] = ['vatican-i', 'leo-xiii', 'pius-xi', 'pius-xii', 'john-xxiii', 'paul-vi', 'john-paul-ii', 'cdf'];
