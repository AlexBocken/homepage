import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// A <button> with no `type` is a submit button. That is harmless in most of the
// app, but the recipe add/edit pages wrap their whole body in one <form> whose
// save button is deliberately `type="button"` (saving goes through
// `formElement.requestSubmit()` after some client-side marshalling). With no
// real submit button in the form, *any* untyped button inside it becomes the
// one that fires — which is how "Cancel" in the base-recipe picker came to
// close the entire edit page.
//
// So: every button rendered inside those forms must say what it is. This is a
// text scan rather than a rendering test on purpose — it costs nothing, it
// catches the mistake in review, and the failure message points at the line.

/** The two form pages and every component they render inside the <form>. */
const FILES = [
	'src/routes/[recipeLang=recipeLang]/edit/[name]/+page.svelte',
	'src/routes/[recipeLang=recipeLang]/add/+page.svelte',
	'src/lib/components/recipes/CreateIngredientList.svelte',
	'src/lib/components/recipes/CreateStepList.svelte',
	'src/lib/components/recipes/BaseRecipeSelector.svelte',
	'src/lib/components/recipes/NutritionMapper.svelte',
	'src/lib/components/recipes/EditTitleImgParallax.svelte',
	'src/lib/components/recipes/EditRecipeNote.svelte',
	'src/lib/components/recipes/SeasonSelect.svelte',
	'src/lib/components/recipes/GenerateAltTextButton.svelte',
	// Mounted outside the form today, but it is a modal over these pages and one
	// re-parenting away from being inside it.
	'src/lib/components/recipes/TranslationApproval.svelte',
];

/**
 * Opening tags of every <button> in `src`, with their 1-based line numbers.
 * Walks to the closing `>` while respecting quotes and `{…}` expressions, so
 * attributes spanning several lines (or holding a `>` in a callback) are read
 * whole rather than truncated at the first bracket.
 */
function buttonTags(src: string): Array<{ line: number; tag: string }> {
	const out: Array<{ line: number; tag: string }> = [];
	const re = /<button\b/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(src))) {
		let i = re.lastIndex;
		let depth = 0;
		let quote: string | null = null;
		while (i < src.length) {
			const c = src[i];
			if (quote) {
				if (c === quote) quote = null;
			} else if (c === '"' || c === "'") {
				quote = c;
			} else if (c === '{') depth++;
			else if (c === '}') depth--;
			else if (c === '>' && depth === 0) break;
			i++;
		}
		out.push({ line: src.slice(0, m.index).split('\n').length, tag: src.slice(m.index, i + 1) });
	}
	return out;
}

describe('recipe form buttons', () => {
	it('every button in the add/edit form tree declares its type', () => {
		const offenders: string[] = [];
		for (const rel of FILES) {
			const path = resolve(process.cwd(), rel);
			// A renamed file should fail loudly rather than silently pass.
			expect(existsSync(path), `${rel} is listed here but does not exist`).toBe(true);
			for (const { line, tag } of buttonTags(readFileSync(path, 'utf8'))) {
				if (!/\btype\s*=/.test(tag)) {
					offenders.push(`${rel}:${line} — ${tag.replace(/\s+/g, ' ').slice(0, 90)}`);
				}
			}
		}
		expect(offenders, `untyped buttons submit the recipe form:\n${offenders.join('\n')}`).toEqual([]);
	});

	it('the scanner reads a whole opening tag, brackets and all', () => {
		const src = `<button class="a" onclick={() => (x > 1 ? f() : g())}>hi</button>\n<button type="button">ok</button>`;
		const tags = buttonTags(src);
		expect(tags).toHaveLength(2);
		expect(tags[0].tag).toContain('x > 1');
		expect(/\btype\s*=/.test(tags[0].tag)).toBe(false);
		expect(/\btype\s*=/.test(tags[1].tag)).toBe(true);
		expect(tags[1].line).toBe(2);
	});
});
