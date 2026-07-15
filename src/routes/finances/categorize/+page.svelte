<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { amount } from '$lib/utils/finance';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';
	import AccountPicker from '$lib/components/finance/AccountPicker.svelte';
	import ExportTokenPanel from '$lib/components/finance/ExportTokenPanel.svelte';

	let { data } = $props();
	const t = $derived(m[financesLang(languageStore.value)]);

	const queue = $derived(data.categorize.txns);

	// key -> assigned account, updated live as we categorize. Seeded once from the
	// stored overrides on mount (reading the prop in a closure, not at init).
	const savedByKey = new SvelteMap<string, string>();

	const firstUnsaved = () => {
		const i = queue.findIndex((tx) => !savedByKey.has(tx.key));
		return i < 0 ? queue.length : i;
	};

	let qi = $state(0);

	onMount(() => {
		for (const o of data.overrides) savedByKey.set(o.key, o.account);
		qi = firstUnsaved();
	});
	const currentTxn = $derived(queue[qi] ?? null);
	const doneCount = $derived(queue.filter((tx) => savedByKey.has(tx.key)).length);

	function onSaved(account: string | null) {
		const tx = currentTxn;
		if (!tx) return;
		if (account) savedByKey.set(tx.key, account);
		else savedByKey.delete(tx.key);
		if (account) qi = Math.min(qi + 1, queue.length);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			qi = Math.min(qi + 1, queue.length);
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			qi = Math.max(qi - 1, 0);
		}
	}

	const fmt = (tx: NonNullable<typeof currentTxn>) =>
		(tx.kind === 'credit' ? '+' : '−') +
		amount(Math.abs(parseFloat(tx.bank_amount)), tx.currency).replace(/^[−-]/, '');
</script>

<svelte:window onkeydown={onKey} />

<svelte:head><title>{t.nav_categorize} · Finanzen</title></svelte:head>

<div class="wrap">
	<p class="intro">{t.cat_intro}</p>

	<div class="progress" role="progressbar" aria-valuenow={doneCount} aria-valuemax={queue.length}>
		<span style="width: {queue.length ? (100 * doneCount) / queue.length : 0}%"></span>
	</div>
	<p class="count fin-num">{doneCount} {t.cat_queue_count_a} {queue.length} · {queue.length - doneCount} {t.cat_queue_count_b}</p>

	{#if currentTxn}
		{@const tx = currentTxn}
		<div class="card">
			<div class="meta">
				<span class="date fin-num">{tx.date}</span>
				{#if savedByKey.has(tx.key)}
					<span class="now">{t.cat_saved_as} {savedByKey.get(tx.key)?.split(':').slice(1).join(':')}</span>
				{/if}
				<span class="src">{tx.source}</span>
			</div>
			<div class="amt fin-num" class:credit={tx.kind === 'credit'} class:debit={tx.kind === 'debit'}>
				{fmt(tx)}
			</div>
			<p class="payee">{tx.payee || t.cat_no_payee}</p>
			<p class="narr">{tx.narration}</p>

			{#key tx.key}
				<AccountPicker
					txn={{
						key: tx.key,
						bank_amount: tx.bank_amount,
						date: tx.date,
						payee: tx.payee,
						narration: tx.narration,
						kind: tx.kind
					}}
					accounts={data.categorize.accounts}
					usage={data.categorize.usage}
					current={savedByKey.get(tx.key) ?? tx.current}
					autofocus
					{onSaved}
				/>
			{/key}

			<div class="nav">
				<button class="ghost" onclick={() => (qi = Math.max(qi - 1, 0))} disabled={qi === 0}>←</button>
				<span class="hint">{t.cat_hint}</span>
				<button class="ghost" onclick={() => (qi = Math.min(qi + 1, queue.length))}>{t.cat_skip} →</button>
			</div>
		</div>
	{:else}
		<div class="done">
			<div class="big">✓</div>
			<h2>{t.cat_queue_empty_title}</h2>
			<p>{t.cat_queue_empty_body}</p>
		</div>
	{/if}

	<ExportTokenPanel />
</div>

<style>
	.wrap {
		max-width: 680px;
		margin-inline: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.intro {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}
	.fin-num {
		font-family: var(--font-fin-num, monospace);
		font-variant-numeric: tabular-nums;
	}
	.progress {
		height: 4px;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		overflow: hidden;
	}
	.progress > span {
		display: block;
		height: 100%;
		background: var(--color-primary);
		transition: width var(--transition-normal);
	}
	.count {
		margin: 0;
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}
	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-md);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.meta {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}
	.now {
		color: var(--color-primary);
	}
	.src {
		margin-left: auto;
		padding: 0.15rem 0.6rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		font-size: var(--text-xs);
	}
	.amt {
		font-size: 2.25rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin-top: 0.4rem;
	}
	.amt.debit {
		color: var(--red);
	}
	.amt.credit {
		color: var(--green);
	}
	.payee {
		margin: 0;
		font-size: var(--text-lg);
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.narr {
		margin: 0 0 0.5rem;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		word-break: break-word;
	}
	.nav {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}
	.hint {
		flex: 1;
		text-align: center;
		color: var(--color-text-tertiary);
		font-size: var(--text-xs);
		font-family: var(--font-fin-num, monospace);
	}
	.ghost {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		border-radius: var(--radius-md);
		padding: 0.35rem 0.7rem;
		font-size: var(--text-sm);
		cursor: pointer;
	}
	.ghost:hover:not(:disabled) {
		color: var(--color-text-primary);
		border-color: var(--color-primary);
	}
	.ghost:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.done {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--color-text-secondary);
	}
	.done .big {
		font-size: 3rem;
		color: var(--green);
	}
	.done h2 {
		margin: 0.3rem 0;
		color: var(--color-text-primary);
	}
	.done p {
		margin: 0;
		font-size: var(--text-sm);
	}
</style>
