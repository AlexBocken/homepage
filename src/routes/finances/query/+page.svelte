<script lang="ts">
	import { untrack } from 'svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m as financesM, financesLang } from '$lib/js/financesI18n';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const t = $derived(financesM[financesLang(languageStore.value)]);

	interface SavedQuery {
		id: string;
		name: string;
		query: string;
	}
	interface Result {
		columns: string[];
		rows: (string | number | boolean | null)[][];
		count: number;
	}

	const DEFAULT_QUERY =
		'SELECT account, sum(position) AS total\nWHERE account ~ "Expenses:"\nGROUP BY account\nORDER BY total DESC';
	// Seed local (editable) state once from the loaded data.
	let saved = $state<SavedQuery[]>(untrack(() => data.saved));
	let query = $state(untrack(() => data.saved[0]?.query ?? DEFAULT_QUERY));
	let result = $state<Result | null>(null);
	let errorMsg = $state<string | null>(null);
	let running = $state(false);
	let saveName = $state('');

	let editor = $state<HTMLTextAreaElement | undefined>(undefined);
	let cursor = $state(0);

	// BQL vocabulary for keyword autocomplete.
	const KEYWORDS = [
		'SELECT', 'WHERE', 'FROM', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'DISTINCT',
		'AS', 'AND', 'OR', 'NOT', 'ASC', 'DESC', 'TRUE', 'FALSE', 'NULL', 'OPEN', 'CLOSE', 'CLEAR',
		'account', 'date', 'year', 'month', 'day', 'payee', 'narration', 'flag', 'tags', 'links',
		'position', 'cost', 'value', 'units', 'number', 'currency', 'balance', 'change', 'weight',
		'sum', 'count', 'first', 'last', 'min', 'max', 'abs', 'neg', 'length', 'root', 'parent', 'leaf'
	];

	// The word being typed (from the last boundary to the cursor).
	const currentWord = $derived.by(() => {
		const upto = query.slice(0, cursor);
		const m = upto.match(/[A-Za-z0-9:_]+$/);
		return m ? m[0] : '';
	});

	function fuzzyScore(word: string, cand: string): number {
		const w = word.toLowerCase();
		const c = cand.toLowerCase();
		if (c === w) return 0;
		if (c.startsWith(w)) return 3;
		if (c.includes(w)) return 2;
		let i = 0;
		for (const ch of c) {
			if (ch === w[i]) i++;
			if (i === w.length) return 1;
		}
		return -1;
	}

	const suggestions = $derived.by(() => {
		const w = currentWord;
		if (w.length < 1) return [];
		const pool = w.includes(':') ? data.accounts : [...KEYWORDS, ...data.accounts];
		return pool
			.map((c) => ({ c, s: fuzzyScore(w, c) }))
			.filter((x) => x.s > 0)
			.sort((a, b) => b.s - a.s || a.c.length - b.c.length)
			.slice(0, 8)
			.map((x) => x.c);
	});

	function applyCompletion(text: string) {
		const start = cursor - currentWord.length;
		query = query.slice(0, start) + text + query.slice(cursor);
		const pos = start + text.length;
		// restore caret after the inserted text
		requestAnimationFrame(() => {
			editor?.focus();
			editor?.setSelectionRange(pos, pos);
			cursor = pos;
		});
	}

	function onKeydown(e: KeyboardEvent) {
		if ((e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey && e.ctrlKey === false)) && suggestions.length && currentWord) {
			// Tab completes; Enter only when a suggestion strongly matches.
			if (e.key === 'Tab') {
				e.preventDefault();
				applyCompletion(suggestions[0]);
				return;
			}
		}
		if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
			e.preventDefault();
			run();
		}
	}
	function syncCursor() {
		cursor = editor?.selectionStart ?? query.length;
	}

	async function run() {
		running = true;
		errorMsg = null;
		try {
			const res = await fetch(`/api/finances/query?q=${encodeURIComponent(query)}`);
			if (res.ok) {
				result = await res.json();
			} else {
				result = null;
				const body = await res.json().catch(() => null);
				errorMsg = body?.message || `${t.qy_error} (${res.status})`;
			}
		} catch {
			errorMsg = t.qy_unreachable;
		} finally {
			running = false;
		}
	}

	async function save() {
		const name = saveName.trim();
		if (!name) return;
		const res = await fetch('/api/finances/saved-queries', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ name, query })
		});
		if (res.ok) {
			const q: SavedQuery = await res.json();
			saved = [...saved.filter((s) => s.name !== q.name), q].sort((a, b) => a.name.localeCompare(b.name));
			saveName = '';
		}
	}

	async function del(q: SavedQuery) {
		if (!(await confirm(`${t.qy_delete_confirm_a}${q.name}${t.qy_delete_confirm_b}`, { destructive: true }))) return;
		const res = await fetch(`/api/finances/saved-queries/${q.id}`, { method: 'DELETE' });
		if (res.ok) saved = saved.filter((s) => s.id !== q.id);
	}
</script>

<svelte:head><title>{t.title_query}</title></svelte:head>

<div class="layout">
	<aside class="saved">
		<h2>{t.qy_saved}</h2>
		{#if saved.length}
			<ul>
				{#each saved as q (q.id)}
					<li>
						<button class="load" onclick={() => (query = q.query)} title={q.query}>{q.name}</button>
						<button class="del" onclick={() => del(q)} aria-label={t.qy_delete} title={t.qy_delete}>×</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">{t.qy_no_saved}</p>
		{/if}
	</aside>

	<main>
		<div class="editor-wrap">
			<textarea
				bind:this={editor}
				class="editor fin-num"
				bind:value={query}
				onkeyup={syncCursor}
				onclick={syncCursor}
				oninput={syncCursor}
				onkeydown={onKeydown}
				spellcheck="false"
				placeholder={t.qy_placeholder}
			></textarea>
			{#if suggestions.length && currentWord}
				<ul class="autocomplete">
					{#each suggestions as s, i (s)}
						<li>
							<button class:top={i === 0} onclick={() => applyCompletion(s)}>{s}</button>
						</li>
					{/each}
					<li class="hint">{t.qy_tab_completes}</li>
				</ul>
			{/if}
		</div>

		<div class="controls">
			<button class="run" onclick={run} disabled={running}>{running ? t.qy_running : t.qy_run} <span class="kbd">⌘↵</span></button>
			<input class="name" placeholder={t.qy_name_placeholder} bind:value={saveName} />
			<button class="save" onclick={save} disabled={!saveName.trim()}>{t.qy_save}</button>
		</div>

		{#if errorMsg}
			<pre class="err">{errorMsg}</pre>
		{:else if result}
			<p class="count muted">{result.count} {result.count === 1 ? t.qy_row_sg : t.qy_row_pl}</p>
			<div class="table-scroll">
				<table class="fin-num">
					<thead>
						<tr>{#each result.columns as col (col)}<th>{col}</th>{/each}</tr>
					</thead>
					<tbody>
						{#each result.rows as row, i (i)}
							<tr>{#each row as v, j (j)}<td class:num={typeof v === 'number'}>{v ?? ''}</td>{/each}</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</main>
</div>

<style>
	.fin-num {
		font-family: var(--font-fin-num);
	}
	.layout {
		display: grid;
		grid-template-columns: 15rem 1fr;
		gap: 1.5rem;
	}
	.saved {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1rem 1.25rem;
		box-shadow: var(--shadow-sm);
		align-self: start;
	}
	.saved h2 {
		margin: 0 0 0.75rem;
		font-size: var(--text-base);
		color: var(--color-text-primary);
	}
	.saved ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.saved li {
		display: flex;
		align-items: center;
	}
	.load {
		flex: 1;
		text-align: left;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.35rem 0.4rem;
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.load:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.del {
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		font-size: var(--text-lg);
		line-height: 1;
		padding: 0 0.3rem;
	}
	.del:hover {
		color: var(--red);
	}

	.editor-wrap {
		position: relative;
	}
	.editor {
		width: 100%;
		min-height: 8rem;
		resize: vertical;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.autocomplete {
		position: absolute;
		z-index: 10;
		left: 1rem;
		bottom: 0.5rem;
		list-style: none;
		margin: 0;
		padding: 0.25rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		max-width: calc(100% - 2rem);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-md);
	}
	.autocomplete button {
		background: var(--color-bg-tertiary);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		padding: 0.2rem 0.5rem;
		font-size: var(--text-sm);
		font-family: var(--font-fin-num);
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.autocomplete button.top {
		border-color: var(--color-primary);
		color: var(--color-text-primary);
	}
	.autocomplete .hint {
		align-self: center;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		padding: 0 0.4rem;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0.75rem 0 1rem;
	}
	.run {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-md);
		padding: 0.45rem 1.1rem;
		cursor: pointer;
		font-size: var(--text-sm);
	}
	.run:disabled {
		opacity: 0.6;
	}
	.kbd {
		opacity: 0.7;
		margin-left: 0.35rem;
		font-size: 0.85em;
	}
	.name {
		flex: 1 1 12rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.45rem 0.7rem;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}
	.save {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.45rem 1rem;
		cursor: pointer;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}
	.save:disabled {
		opacity: 0.5;
	}

	.err {
		background: color-mix(in srgb, var(--red) 12%, transparent);
		border: 1px solid var(--red);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		color: var(--color-text-primary);
		white-space: pre-wrap;
		font-size: var(--text-sm);
	}
	.count {
		margin: 0 0 0.5rem;
	}
	.muted {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}
	.table-scroll {
		overflow-x: auto;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 0.4rem 0.7rem;
		text-align: left;
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
		white-space: nowrap;
	}
	th {
		position: sticky;
		top: 0;
		background: var(--color-bg-secondary);
		color: var(--color-text-secondary);
		font-weight: 600;
	}
	td.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 800px) {
		.layout {
			grid-template-columns: 1fr;
		}
	}
</style>
