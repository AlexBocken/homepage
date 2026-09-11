/**
 * The stored council markup carries a footnote's number and nothing else —
 * `<sup class="fn" data-fn="12">12</sup>` — because that is all the three
 * editions agree on. Turning it into an anchor needs to know which document is
 * on the page, so it happens here, wherever the text is about to be shown.
 */
const MARKER = /<sup class="fn" data-fn="(\d+)">(\d+)<\/sup>/g;

type Options = {
	/** `link` points a marker at the note of that number, `drop` removes it. */
	notes?: { kind: 'link'; document: string } | { kind: 'drop' };
};

export function addressed(html: string, options: Options = {}): string {
	const notes = options.notes ?? { kind: 'drop' as const };
	return html.replace(MARKER, (_, k: string, shown: string) =>
		notes.kind === 'drop' ? '' : `<sup class="cfn"><a id="${notes.document}-ref-${k}" href="#${notes.document}-note-${k}" data-fn="${k}">${shown}</a></sup>`
	);
}
