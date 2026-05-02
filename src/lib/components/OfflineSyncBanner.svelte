<script lang="ts">
	import { onMount } from 'svelte';
	import { pwaStore } from '$lib/stores/pwa.svelte';
	import { m, type CommonLang } from '$lib/js/commonI18n';
	import Download from '@lucide/svelte/icons/download';
	import X from '@lucide/svelte/icons/x';

	let { lang = 'de' }: { lang?: string } = $props();

	const DISMISS_KEY = 'bocken-offline-banner-dismissed';

	let mounted = $state(false);
	let dismissed = $state(false);

	const t = $derived(m[lang as CommonLang]);

	onMount(async () => {
		dismissed = localStorage.getItem(DISMISS_KEY) === '1';
		mounted = true;
		await pwaStore.initialize();
	});

	function dismiss() {
		dismissed = true;
		localStorage.setItem(DISMISS_KEY, '1');
	}

	async function handleSync() {
		await pwaStore.syncForOffline();
	}

	const visible = $derived(
		mounted &&
		pwaStore.isStandalone &&
		!pwaStore.isOfflineAvailable &&
		(!dismissed || pwaStore.isSyncing)
	);

	const progressPct = $derived.by(() => {
		const ip = pwaStore.syncProgress?.imageProgress;
		if (!ip || ip.total === 0) return 0;
		return Math.round((ip.completed / ip.total) * 100);
	});
</script>

<style>
	.banner {
		display: grid;
		grid-template-columns: auto 1fr auto;
		gap: 1rem;
		align-items: center;
		max-width: 1200px;
		margin: 1rem auto;
		padding: 0.9rem 1.1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
		position: relative;
		overflow: hidden;
	}
	.banner::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 4px;
		background: var(--green, var(--nord14));
	}

	.icon-wrap {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		background: color-mix(in oklab, var(--green, var(--nord14)) 18%, transparent);
		color: var(--green, var(--nord14));
		flex-shrink: 0;
	}

	.copy {
		min-width: 0;
	}
	.title {
		font-weight: 600;
		font-size: 0.95rem;
		color: var(--color-text-primary);
		line-height: 1.25;
	}
	.body {
		font-size: 0.82rem;
		color: var(--color-text-secondary);
		margin-top: 0.15rem;
		line-height: 1.35;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.sync-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 0.95rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--color-text-on-primary);
		background: var(--color-primary);
		border: none;
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition: var(--transition-fast);
		white-space: nowrap;
	}
	.sync-btn:hover:not(:disabled) {
		background: var(--color-primary-hover);
		transform: scale(1.03);
	}
	.sync-btn:disabled {
		opacity: 0.7;
		cursor: progress;
	}

	.dismiss-btn {
		background: transparent;
		border: none;
		color: var(--color-text-tertiary);
		padding: 0.35rem;
		border-radius: 50%;
		cursor: pointer;
		display: grid;
		place-items: center;
		transition: var(--transition-fast);
	}
	.dismiss-btn:hover {
		background: var(--color-bg-elevated);
		color: var(--color-text-primary);
	}

	.progress {
		grid-column: 1 / -1;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin-top: 0.35rem;
	}
	.progress-text {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
	.progress-bar {
		height: 4px;
		width: 100%;
		background: var(--color-bg-tertiary);
		border-radius: 2px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: var(--green, var(--nord14));
		transition: width 200ms ease-out;
	}

	.error {
		grid-column: 1 / -1;
		font-size: 0.78rem;
		color: var(--red, var(--nord11));
		margin-top: 0.3rem;
	}

	@media (max-width: 560px) {
		.banner {
			grid-template-columns: auto 1fr auto;
			gap: 0.7rem;
			padding: 0.75rem 0.9rem;
			margin: 0.75rem auto;
		}
		.body {
			display: none;
		}
		.sync-btn {
			padding: 0.45rem 0.75rem;
			font-size: 0.8rem;
		}
	}
</style>

{#if visible}
	<aside class="banner" role="status" aria-live="polite">
		<div class="icon-wrap" aria-hidden="true">
			<Download size={20} strokeWidth={2} />
		</div>

		<div class="copy">
			<div class="title">{t.offline_banner_title}</div>
			<div class="body">{t.offline_banner_body}</div>
		</div>

		<div class="actions">
			<button
				class="sync-btn"
				onclick={handleSync}
				disabled={pwaStore.isSyncing}
				type="button"
			>
				{pwaStore.isSyncing ? t.syncing : t.offline_banner_action}
			</button>
			{#if !pwaStore.isSyncing}
				<button
					class="dismiss-btn"
					onclick={dismiss}
					aria-label={t.dismiss}
					title={t.dismiss}
					type="button"
				>
					<X size={16} strokeWidth={2} />
				</button>
			{/if}
		</div>

		{#if pwaStore.isSyncing && pwaStore.syncProgress}
			<div class="progress">
				<div class="progress-text">
					{pwaStore.syncProgress.message}
					{#if pwaStore.syncProgress.imageProgress}
						· {progressPct}%
					{/if}
				</div>
				{#if pwaStore.syncProgress.imageProgress}
					<div class="progress-bar">
						<div class="progress-fill" style="width: {progressPct}%"></div>
					</div>
				{/if}
			</div>
		{/if}

		{#if pwaStore.error}
			<div class="error">{pwaStore.error}</div>
		{/if}
	</aside>
{/if}
