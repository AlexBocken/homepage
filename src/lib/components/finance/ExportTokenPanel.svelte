<script lang="ts">
	import { onMount } from 'svelte';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';
	import { confirm } from '$lib/js/confirmDialog.svelte';

	const t = $derived(m[financesLang(languageStore.value)]);

	interface Token {
		token: string;
		label: string;
		createdAt: string;
		lastUsedAt: string | null;
	}

	let tokens = $state<Token[]>([]);
	let label = $state('');
	let busy = $state(false);
	let copied = $state<string | null>(null);

	async function refresh() {
		const res = await fetch('/api/finances/export/tokens');
		if (res.ok) tokens = (await res.json()).tokens;
	}

	onMount(refresh);

	async function mint() {
		if (busy) return;
		busy = true;
		try {
			const res = await fetch('/api/finances/export/tokens', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ label })
			});
			if (res.ok) {
				label = '';
				await refresh();
			}
		} finally {
			busy = false;
		}
	}

	async function revoke(token: string) {
		if (!(await confirm(t.tok_revoke_confirm, {
			destructive: true,
			confirmText: t.action_revoke,
			cancelText: t.action_cancel,
		}))) return;
		const res = await fetch(`/api/finances/export/tokens/${encodeURIComponent(token)}`, {
			method: 'DELETE'
		});
		if (res.ok) tokens = tokens.filter((x) => x.token !== token);
	}

	async function copy(token: string) {
		try {
			await navigator.clipboard.writeText(token);
			copied = token;
			setTimeout(() => (copied = copied === token ? null : copied), 1500);
		} catch {
			copied = null;
		}
	}
</script>

<details class="panel">
	<summary>{t.tok_title}</summary>
	<p class="desc">{t.tok_desc}</p>

	<div class="mint">
		<input bind:value={label} placeholder={t.tok_label_ph} maxlength="80" />
		<button class="primary" onclick={mint} disabled={busy}>{t.tok_new}</button>
	</div>

	{#if tokens.length === 0}
		<p class="none">{t.tok_none}</p>
	{:else}
		<ul class="tokens">
			{#each tokens as tk (tk.token)}
				<li>
					<div class="row1">
						<code class="val">{tk.token}</code>
						<button class="mini" onclick={() => copy(tk.token)}>
							{copied === tk.token ? t.tok_copied : t.tok_copy}
						</button>
						<button class="mini danger" onclick={() => revoke(tk.token)}>{t.tok_revoke}</button>
					</div>
					<div class="row2">
						{#if tk.label}<span class="tlabel">{tk.label}</span>{/if}
						<span class="used">
							{tk.lastUsedAt
								? `${t.tok_last_used} ${new Date(tk.lastUsedAt).toLocaleDateString()}`
								: t.tok_never_used}
						</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</details>

<style>
	.panel {
		margin-top: 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		padding: 0.75rem 1rem;
	}
	summary {
		cursor: pointer;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.desc {
		margin: 0.6rem 0;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}
	.mint {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.mint input {
		flex: 1;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		padding: 0.45rem 0.6rem;
		font-size: var(--text-sm);
	}
	.primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-md);
		padding: 0.45rem 0.9rem;
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
	}
	.primary:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.none {
		margin: 0;
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}
	.tokens {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.tokens li {
		border-top: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
		padding-top: 0.6rem;
	}
	.row1 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.val {
		flex: 1;
		font-family: var(--font-fin-num, monospace);
		font-size: var(--text-xs);
		color: var(--color-text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mini {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		border-radius: var(--radius-sm);
		padding: 0.25rem 0.55rem;
		font-size: var(--text-xs);
		cursor: pointer;
	}
	.mini:hover {
		color: var(--color-text-primary);
	}
	.mini.danger:hover {
		color: var(--red);
		border-color: var(--red);
	}
	.row2 {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.3rem;
		font-size: var(--text-xs);
		color: var(--color-text-tertiary);
	}
	.tlabel {
		color: var(--color-text-secondary);
	}
</style>
