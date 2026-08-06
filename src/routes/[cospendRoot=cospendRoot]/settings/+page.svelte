<script>
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import { detectCospendLang, locale, m } from '$lib/js/cospendI18n';
	import KeyRound from '@lucide/svelte/icons/key-round';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Trash2 from '@lucide/svelte/icons/trash-2';

	const lang = $derived(detectCospendLang(page.url.pathname));
	const t = $derived(m[lang]);
	const loc = $derived(locale(lang));

	const EXPORT_URL = $derived(`${page.url.origin}/api/cospend/export`);

	/** @typedef {{ token: string, label: string, createdAt?: string, lastUsedAt?: string | null }} ApiToken */
	/** @type {ApiToken[]} */
	let tokens = $state([]);
	let loading = $state(true);
	let generating = $state(false);
	let newLabel = $state('');
	/** @type {string | null} */
	let copied = $state(null);

	onMount(async () => {
		try {
			const res = await fetch('/api/cospend/export/tokens');
			if (res.ok) tokens = (await res.json()).tokens ?? [];
		} finally {
			loading = false;
		}
	});

	async function generate() {
		if (generating) return;
		generating = true;
		try {
			const res = await fetch('/api/cospend/export/tokens', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ label: newLabel.trim() })
			});
			if (res.ok) {
				tokens = [await res.json(), ...tokens];
				newLabel = '';
			}
		} finally {
			generating = false;
		}
	}

	/** @param {string} token */
	async function copy(token) {
		try {
			await navigator.clipboard.writeText(token);
			copied = token;
			setTimeout(() => (copied === token ? (copied = null) : null), 1500);
		} catch {
			/* clipboard blocked — ignore */
		}
	}

	/** @param {ApiToken} tok */
	async function revoke(tok) {
		if (!(await confirm(t.api_revoke_confirm, {
			destructive: true,
			confirmText: t.action_revoke,
			cancelText: t.action_cancel,
		}))) return;
		const res = await fetch(`/api/cospend/export/tokens/${encodeURIComponent(tok.token)}`, {
			method: 'DELETE'
		});
		if (res.ok) tokens = tokens.filter((x) => x.token !== tok.token);
	}

	/** @param {string} token */
	const mask = (token) => `${token.slice(0, 6)}${'•'.repeat(10)}${token.slice(-4)}`;
	/** @param {string | undefined | null} d */
	const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(loc, { day: '2-digit', month: 'short', year: 'numeric' }) : '');
</script>

<svelte:head><title>{t.settings_title} · Cospend</title></svelte:head>

<div class="wrap">
	<h1>{t.settings_title}</h1>

	<section class="card">
		<h2><KeyRound size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.api_access_title}</h2>
		<p class="desc">{t.api_access_desc}</p>
		<p class="scope">{t.api_access_scope}</p>

		<form class="gen" onsubmit={(e) => { e.preventDefault(); generate(); }}>
			<input class="label-in" placeholder={t.api_label_placeholder} bind:value={newLabel} maxlength="80" />
			<button type="submit" class="gen-btn" disabled={generating}>
				{generating ? t.api_generating : t.api_generate}
			</button>
		</form>

		{#if loading}
			<p class="muted">…</p>
		{:else if tokens.length === 0}
			<p class="muted none">{t.api_none}</p>
		{:else}
			<ul class="tokens">
				{#each tokens as tok (tok.token)}
					<li class="tok">
						<div class="tok-main">
							{#if tok.label}<span class="tok-label">{tok.label}</span>{/if}
							<code class="tok-val fin-num">{mask(tok.token)}</code>
						</div>
						<div class="tok-meta">
							<span>{t.api_created}: {fmtDate(tok.createdAt)}</span>
							<span>{t.api_last_used}: {tok.lastUsedAt ? fmtDate(tok.lastUsedAt) : t.api_never}</span>
						</div>
						<div class="tok-actions">
							<button class="icon-btn" onclick={() => copy(tok.token)} title={t.api_copy} aria-label={t.api_copy}>
								{#if copied === tok.token}<Check size={16} color="var(--green)" />{:else}<Copy size={16} />{/if}
							</button>
							<button class="icon-btn danger" onclick={() => revoke(tok)} title={t.api_revoke} aria-label={t.api_revoke}>
								<Trash2 size={16} />
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="usage">
			<span class="usage-label">{t.api_usage}</span>
			<pre class="fin-num">curl -H "Authorization: Bearer &lt;token&gt;" \
  {EXPORT_URL}</pre>
		</div>
	</section>
</div>

<style>
	.fin-num {
		font-family: ui-monospace, 'SF Mono', 'Cascadia Code', 'JetBrains Mono', 'Menlo', monospace;
	}
	.wrap {
		max-width: 720px;
		margin-inline: auto;
		padding: 1.5rem 1rem 4rem;
	}
	h1 {
		margin: 0 0 1.5rem;
		font-size: var(--text-2xl);
		color: var(--color-text-primary);
	}
	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		box-shadow: var(--shadow-sm);
	}
	h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0 0 0.75rem;
		font-size: var(--text-lg);
		color: var(--color-text-primary);
	}
	.desc {
		margin: 0 0 0.5rem;
		color: var(--color-text-secondary);
	}
	.scope {
		margin: 0 0 1.25rem;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
	.gen {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
	}
	.label-in {
		flex: 1 1 16rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}
	.gen-btn {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border: none;
		border-radius: var(--radius-md);
		padding: 0.5rem 1.1rem;
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
	}
	.gen-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.muted {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
	}
	.none {
		padding: 0.5rem 0;
	}
	.tokens {
		list-style: none;
		margin: 0 0 1.25rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.tok {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		padding: 0.6rem 0.75rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}
	.tok-main {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 12rem;
		flex: 1 1 auto;
	}
	.tok-label {
		font-weight: 600;
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}
	.tok-val {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}
	.tok-meta {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		white-space: nowrap;
	}
	.tok-actions {
		display: flex;
		gap: 0.35rem;
	}
	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all var(--transition-fast);
	}
	.icon-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}
	.icon-btn.danger:hover {
		color: var(--red);
		border-color: var(--red);
	}
	.usage {
		border-top: 1px solid var(--color-border);
		padding-top: 1rem;
	}
	.usage-label {
		display: block;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		margin-bottom: 0.4rem;
	}
	pre {
		margin: 0;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.75rem 1rem;
		overflow-x: auto;
		font-size: var(--text-sm);
		color: var(--color-text-primary);
	}
</style>
