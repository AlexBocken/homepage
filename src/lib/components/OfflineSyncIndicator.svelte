<script lang="ts">
	import { onMount } from 'svelte';
	import { pwaStore } from '$lib/stores/pwa.svelte';
	import { m, type CommonLang } from '$lib/js/commonI18n';

	let { lang = 'de' }: { lang?: string } = $props();

	let mounted = $state(false);
	let open = $state(false);

	const t = $derived(m[lang as CommonLang]);

	onMount(async () => {
		mounted = true;
		await pwaStore.initialize();
	});

	function closeOnOutsideClick(node: HTMLElement) {
		const handler = (e: MouseEvent) => {
			if (!open) return;
			if (!node.contains(e.target as Node)) {
				open = false;
			}
		};
		document.addEventListener('click', handler);
		return () => document.removeEventListener('click', handler);
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '';
		const d = new Date(iso);
		return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	async function handleSync() {
		await pwaStore.syncForOffline();
	}

	async function handleClear() {
		await pwaStore.clearOfflineData();
		open = false;
	}

	const visible = $derived(
		mounted && pwaStore.isStandalone && pwaStore.isOfflineAvailable
	);

	const progressPct = $derived.by(() => {
		const ip = pwaStore.syncProgress?.imageProgress;
		if (!ip || ip.total === 0) return 0;
		return Math.round((ip.completed / ip.total) * 100);
	});
</script>

<style>
	.wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
	}

	.pip {
		--size: 8px;
		appearance: none;
		background: transparent;
		border: none;
		padding: 3px;
		display: grid;
		place-items: center;
		cursor: pointer;
		border-radius: 50%;
		transition: background 150ms;
	}
	.pip:hover {
		background: var(--nav-hover-bg, rgba(255,255,255,0.12));
	}
	.dot {
		width: var(--size);
		height: var(--size);
		border-radius: 50%;
		background: var(--green, var(--nord14));
		box-shadow:
			0 0 0 2px color-mix(in oklab, var(--green, var(--nord14)) 70%, transparent),
			0 0 6px color-mix(in oklab, var(--green, var(--nord14)) 90%, transparent);
		transition: transform 150ms;
	}
	.pip:hover .dot {
		transform: scale(1.18);
	}
	.dot.syncing {
		animation: pulse 1.1s ease-in-out infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.55; transform: scale(0.85); }
	}

	.popover {
		--menu-bg: rgba(46, 52, 64, 0.95);
		--menu-border: rgba(255,255,255,0.08);
		--menu-text: rgba(255,255,255,0.92);
		--menu-text-secondary: rgba(255,255,255,0.6);
		position: absolute;
		top: calc(100% + 10px);
		left: -8px;
		min-width: 240px;
		background: var(--menu-bg);
		color: var(--menu-text);
		border: 1px solid var(--menu-border);
		border-radius: 10px;
		padding: 0.85rem 0.95rem;
		box-shadow: 0 8px 24px rgba(0,0,0,0.3);
		z-index: 50;
		backdrop-filter: blur(16px);
	}
	.popover::before {
		content: '';
		position: absolute;
		top: -7px;
		left: 0.7rem;
		border: 7px solid transparent;
		border-bottom-color: var(--menu-bg);
		border-top: 0;
	}
	@media (prefers-color-scheme: dark) {
		.popover { --menu-bg: rgba(20, 20, 20, 0.95); }
	}
	:global(:root[data-theme="dark"]) .popover {
		--menu-bg: rgba(20, 20, 20, 0.95);
	}
	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .popover {
			--menu-bg: rgba(255, 255, 255, 0.97);
			--menu-border: rgba(0,0,0,0.08);
			--menu-text: var(--color-text-primary);
			--menu-text-secondary: var(--color-text-secondary);
		}
	}
	:global(:root[data-theme="light"]) .popover {
		--menu-bg: rgba(255, 255, 255, 0.97);
		--menu-border: rgba(0,0,0,0.08);
		--menu-text: var(--color-text-primary);
		--menu-text-secondary: var(--color-text-secondary);
	}

	.status-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--green, var(--nord14));
	}
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--green, var(--nord14));
	}
	.meta {
		font-size: 0.75rem;
		color: var(--menu-text-secondary);
		margin-top: 0.35rem;
		line-height: 1.4;
	}

	.divider {
		height: 1px;
		background: var(--menu-border);
		margin: 0.7rem 0;
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.action {
		appearance: none;
		text-align: left;
		background: transparent;
		border: none;
		color: var(--menu-text);
		font-size: 0.85rem;
		padding: 0.45rem 0.55rem;
		border-radius: 6px;
		cursor: pointer;
		transition: background 120ms;
	}
	.action:hover:not(:disabled) {
		background: color-mix(in oklab, var(--menu-text) 10%, transparent);
	}
	.action.danger { color: var(--red, var(--nord11)); }
	.action:disabled { opacity: 0.5; cursor: not-allowed; }

	.progress {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.progress-text {
		font-size: 0.72rem;
		color: var(--menu-text-secondary);
	}
	.progress-bar {
		width: 100%;
		height: 3px;
		background: color-mix(in oklab, var(--menu-text) 12%, transparent);
		border-radius: 2px;
		overflow: hidden;
	}
	.progress-fill {
		height: 100%;
		background: var(--green, var(--nord14));
		transition: width 200ms ease-out;
	}

	.error {
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--red, var(--nord11));
	}
</style>

{#if visible}
	<div class="wrap" {@attach closeOnOutsideClick}>
		<button
			class="pip"
			onclick={() => open = !open}
			aria-label={t.offline_ready}
			aria-expanded={open}
			title={t.offline_ready}
			type="button"
		>
			<span class="dot" class:syncing={pwaStore.isSyncing}></span>
		</button>

		{#if open}
			<div class="popover" role="dialog">
				<div class="status-row">
					<span class="status-dot"></span>
					{t.offline_ready}
				</div>
				<div class="meta">
					{pwaStore.recipeCount} {t.recipes_word}
					{#if pwaStore.lastSyncDate}
						<br />{t.last_sync}: {formatDate(pwaStore.lastSyncDate)}
					{/if}
				</div>

				<div class="divider"></div>

				<div class="actions">
					<button
						class="action"
						onclick={handleSync}
						disabled={pwaStore.isSyncing}
						type="button"
					>
						{pwaStore.isSyncing ? t.syncing : t.sync_now}
					</button>
					<button
						class="action danger"
						onclick={handleClear}
						disabled={pwaStore.isSyncing}
						type="button"
					>
						{t.clear_offline_data}
					</button>
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
			</div>
		{/if}
	</div>
{/if}
