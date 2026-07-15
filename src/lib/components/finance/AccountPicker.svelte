<script lang="ts">
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';

	const t = $derived(m[financesLang(languageStore.value)]);

	/** The transaction to categorize. `bank_amount` is the raw Decimal string from
	 *  finance-service; it and `key` go into the stored overrides row verbatim. */
	interface PickTarget {
		key: string;
		bank_amount: string;
		date: string;
		payee: string | null;
		narration: string | null;
		kind: 'credit' | 'debit';
	}

	let {
		txn,
		accounts,
		usage,
		current = null,
		autofocus = false,
		onSaved
	}: {
		txn: PickTarget;
		accounts: string[];
		usage: Record<string, number>;
		/** The already-saved override account, if any (shows a clear action). */
		current?: string | null;
		autofocus?: boolean;
		/** Called after a successful save; `null` when the assignment was cleared. */
		onSaved: (account: string | null) => void;
	} = $props();

	let query = $state('');
	let sel = $state(0);
	let saving = $state(false);
	let err = $state('');

	const isUncat = (a: string | null) =>
		a === 'Expenses:Uncategorized' || a === 'Income:Uncategorized' || a === null;
	const short = (a: string) => a.split(':').slice(1).join(':');

	// Income accounts first for a credit, Expenses first for a debit, then by usage.
	function ranked(): string[] {
		const k = txn.kind === 'credit' ? 'Income' : 'Expenses';
		return [...accounts].sort(
			(a, b) =>
				(a.startsWith(k) ? 0 : 1) - (b.startsWith(k) ? 0 : 1) ||
				(usage[b] ?? 0) - (usage[a] ?? 0)
		);
	}

	// Subsequence fuzzy score (lower = better): first-match index + gap penalty.
	function score(account: string, q: string): number {
		const a = account.toLowerCase();
		let j = 0,
			first = -1,
			prev = -1,
			gaps = 0;
		for (let k = 0; k < a.length && j < q.length; k++) {
			if (a[k] === q[j]) {
				if (first < 0) first = k;
				else gaps += k - prev - 1;
				prev = k;
				j++;
			}
		}
		return j === q.length ? first + gaps * 0.5 : -1;
	}

	const matches = $derived.by(() => {
		const pool = ranked();
		const q = query.toLowerCase().replace(/\s+/g, '');
		if (!q) return pool.slice(0, 8);
		return pool
			.map((a) => [a, score(a, q)] as const)
			.filter((x) => x[1] >= 0)
			.sort((x, y) => x[1] - y[1] || (usage[y[0]] ?? 0) - (usage[x[0]] ?? 0))
			.slice(0, 9)
			.map((x) => x[0]);
	});

	const chips = $derived(
		accounts.filter((a) => a.startsWith(txn.kind === 'credit' ? 'Income' : 'Expenses')).slice(0, 6)
	);

	// The highlighted row, clamped to the current (possibly shrunk) match list.
	const active = $derived(Math.min(sel, Math.max(0, matches.length - 1)));

	async function save(account: string | null) {
		if (saving) return;
		saving = true;
		err = '';
		try {
			const res = await fetch('/api/finances/overrides', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					key: txn.key,
					account: account ?? '',
					date: txn.date,
					amount: txn.bank_amount,
					payee: txn.payee ?? '',
					narration: txn.narration ?? ''
				})
			});
			if (!res.ok) throw new Error(String(res.status));
			query = '';
			sel = 0;
			onSaved(account);
		} catch {
			err = t.qy_error;
		} finally {
			saving = false;
		}
	}

	function onKey(e: KeyboardEvent) {
		if (e.key >= '1' && e.key <= '9') {
			const k = +e.key - 1;
			if (matches[k]) {
				e.preventDefault();
				save(matches[k]);
			}
		} else if (e.key === 'Enter') {
			if (matches[active]) {
				e.preventDefault();
				save(matches[active]);
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			sel = Math.min(active + 1, matches.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			sel = Math.max(active - 1, 0);
		} else if (e.key === 'Escape' && query) {
			e.preventDefault();
			e.stopPropagation();
			query = '';
			sel = 0;
		}
	}

</script>

<div class="picker">
	<!-- svelte-ignore a11y_autofocus -->
	<input
		bind:value={query}
		{autofocus}
		autocomplete="off"
		spellcheck="false"
		disabled={saving}
		placeholder={isUncat(current) ? t.cat_ph_assign : t.cat_ph_redefine}
		onkeydown={onKey}
	/>

	<ul class="matches">
		{#each matches as account, i (account)}
			<li>
				<button
					type="button"
					class="row"
					class:on={i === active}
					disabled={saving}
					onclick={() => save(account)}
					onmouseenter={() => (sel = i)}
				>
					<span class="kbd">{i + 1}</span>
					<span class="acct"
						><span class="dim">{account.split(':').slice(0, -1).join(':')}:</span
						>{account.split(':').at(-1)}</span
					>
					<span class="use">{usage[account] ?? 0}</span>
				</button>
			</li>
		{/each}
	</ul>

	<div class="chips">
		{#each chips as account (account)}
			<button type="button" class="chip" disabled={saving} onclick={() => save(account)}
				>{short(account)}</button
			>
		{/each}
		{#if current && !isUncat(current)}
			<button type="button" class="chip clear" disabled={saving} onclick={() => save(null)}
				>{t.cat_clear}</button
			>
		{/if}
	</div>

	{#if err}<p class="err">{err}</p>{/if}
</div>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	input {
		width: 100%;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-family: var(--font-fin-num, monospace);
		font-size: var(--text-base);
		padding: 0.65rem 0.75rem;
		outline: none;
	}
	input:focus {
		border-color: var(--color-primary);
	}
	.matches {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 280px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.5rem 0.6rem;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--color-text-primary);
		font-family: var(--font-fin-num, monospace);
		font-size: var(--text-sm);
		cursor: pointer;
		text-align: left;
	}
	.row.on {
		background: var(--color-bg-elevated);
		border-color: var(--color-primary);
	}
	.kbd {
		flex: 0 0 1.25rem;
		display: grid;
		place-items: center;
		height: 1.25rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg-secondary);
		color: var(--color-text-secondary);
		font-size: var(--text-xs);
	}
	.row.on .kbd {
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	.acct {
		flex: 1;
		word-break: break-word;
	}
	.acct .dim {
		color: var(--color-text-tertiary);
	}
	.use {
		margin-left: auto;
		color: var(--color-text-tertiary);
		font-size: var(--text-xs);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.chip {
		font-family: var(--font-fin-num, monospace);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		padding: 0.3rem 0.6rem;
		cursor: pointer;
	}
	.chip:hover {
		color: var(--color-text-primary);
		border-color: var(--color-primary);
	}
	.chip.clear {
		color: var(--red);
		border-color: color-mix(in srgb, var(--red) 40%, transparent);
	}
	.err {
		margin: 0;
		color: var(--red);
		font-size: var(--text-sm);
	}
</style>
