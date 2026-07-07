<script lang="ts">
	import { money, amount } from '$lib/utils/finance';
	import type { Posting } from '$lib/utils/finance';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';

	const t = $derived(m[financesLang(languageStore.value)]);

	// Accepts any journal-txn shape (spending, overview, account view).
	interface TxnLike {
		date: string;
		payee: string | null;
		narration: string | null;
		tags: string[];
		postings: Posting[];
	}

	let {
		txn,
		onClose,
		onPayee = undefined,
		onAccount = undefined
	}: {
		txn: TxnLike;
		onClose: () => void;
		/** Optional: called with the payee to find its transactions. */
		onPayee?: ((payee: string) => void) | undefined;
		/** Optional: called with a posting account to go to that account. */
		onAccount?: ((account: string) => void) | undefined;
	} = $props();

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={onKey} />

<div class="overlay" role="presentation" onclick={onClose}>
	<div
		class="modal"
		role="dialog"
		aria-modal="true"
		aria-label={t.td_title}
		tabindex="-1"
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
	>
		<header class="head">
			<div>
				<span class="date fin-num">{txn.date}</span>
				{#if txn.payee}
					{#if onPayee}
						<button class="payee-link" onclick={() => onPayee?.(txn.payee ?? '')}>{txn.payee}</button>
					{:else}
						<span class="payee">{txn.payee}</span>
					{/if}
				{/if}
				<p class="narr">{txn.narration ?? ''}</p>
				{#if txn.tags.length}
					<div class="tags">{#each txn.tags as tag (tag)}<span class="tag">#{tag}</span>{/each}</div>
				{/if}
			</div>
			<button class="close" onclick={onClose} aria-label={t.close}>×</button>
		</header>

		<table class="postings">
			<thead>
				<tr><th>{t.account_col}</th><th class="r">{t.amount_col}</th><th class="r">CHF</th></tr>
			</thead>
			<tbody>
				{#each txn.postings as p, i (i)}
					<tr>
						<td class="acct">
							{#if onAccount}<button class="acct-link" onclick={() => onAccount?.(p.account)}>{p.account}</button>
							{:else}{p.account}{/if}
						</td>
						<td class="r num fin-num">
							{#if p.units}{amount(p.units.number, p.units.currency)}{:else}–{/if}
							{#if p.cost}<span class="cost">@ {amount(p.cost.number, p.cost.currency)}</span>{/if}
						</td>
						<td class="r num fin-num" class:muted={p.units?.currency === 'CHF'}>
							{p.chf == null ? '' : money(p.chf, true)}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(2px);
	}
	.modal {
		width: min(560px, 100%);
		max-height: 85vh;
		overflow-y: auto;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-lg);
		padding: 1.25rem 1.5rem;
	}
	.fin-num {
		font-family: var(--font-fin-num, monospace);
		font-variant-numeric: tabular-nums;
	}
	.head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.date {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
		margin-right: 0.5rem;
	}
	.payee,
	.payee-link {
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: var(--text-lg);
	}
	.payee-link {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}
	.payee-link:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.narr {
		margin: 0.35rem 0 0;
		color: var(--color-text-secondary);
	}
	.tags {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.5rem;
	}
	.tag {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
	.close {
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		font-size: 1.6rem;
		line-height: 1;
		cursor: pointer;
		align-self: flex-start;
	}
	.close:hover {
		color: var(--color-text-primary);
	}

	.postings {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 0.45rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
	}
	th {
		color: var(--color-text-secondary);
		font-weight: 600;
	}
	.r {
		text-align: right;
	}
	.num {
		white-space: nowrap;
	}
	.acct {
		color: var(--color-text-primary);
		word-break: break-word;
	}
	.acct-link {
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		color: inherit;
		font: inherit;
		text-align: left;
	}
	.acct-link:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.cost {
		color: var(--color-text-tertiary);
		margin-left: 0.35rem;
	}
	.muted {
		color: var(--color-text-tertiary);
	}
</style>
