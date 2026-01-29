<script lang="ts">
	import { onMount } from 'svelte';
	import { pwaStore } from '$lib/stores/pwa.svelte';

	let { lang = 'de' }: { lang?: string } = $props();

	let showTooltip = $state(false);
	let mounted = $state(false);

	const labels = $derived({
		syncForOffline: lang === 'en' ? 'Save for offline' : 'Offline speichern',
		syncing: lang === 'en' ? 'Syncing...' : 'Synchronisiere...',
		offlineReady: lang === 'en' ? 'Offline ready' : 'Offline bereit',
		lastSync: lang === 'en' ? 'Last sync' : 'Letzte Sync',
		recipes: lang === 'en' ? 'recipes' : 'Rezepte',
		syncNow: lang === 'en' ? 'Sync now' : 'Jetzt synchronisieren',
		clearData: lang === 'en' ? 'Clear offline data' : 'Offline-Daten löschen'
	});

	onMount(async () => {
		mounted = true;
		// Initialize PWA store (checks standalone mode, starts auto-sync if needed)
		await pwaStore.initialize();
	});

	async function handleSync() {
		await pwaStore.syncForOffline();
	}

	async function handleClear() {
		await pwaStore.clearOfflineData();
		showTooltip = false;
	}

	function formatDate(isoString: string | null): string {
		if (!isoString) return '';
		const date = new Date(isoString);
		return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'de-DE', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<style>
	.offline-sync {
		position: relative;
	}

	.sync-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		transition: color 100ms;
	}

	.sync-button:hover,
	.sync-button:focus {
		color: var(--nord8);
	}

	.sync-button.syncing {
		animation: pulse 1s infinite;
	}

	.sync-button.available {
		color: var(--nord14);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.sync-icon {
		width: 1.5rem;
		height: 1.5rem;
		fill: currentColor;
	}

	.tooltip {
		position: absolute;
		top: 100%;
		right: 0;
		margin-top: 0.5rem;
		background: var(--nord0);
		border: 1px solid var(--nord3);
		border-radius: 0.5rem;
		padding: 1rem;
		min-width: 200px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 100;
	}

	.tooltip-content {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.status {
		font-size: 0.875rem;
		color: var(--nord4);
	}

	.status.ready {
		color: var(--nord14);
	}

	.tooltip-button {
		background: var(--nord3);
		border: none;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background 100ms;
	}

	.tooltip-button:hover {
		background: var(--nord2);
	}

	.tooltip-button.clear {
		background: var(--nord11);
	}

	.tooltip-button.clear:hover {
		background: #c04040;
	}

	.tooltip-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.meta {
		font-size: 0.75rem;
		color: var(--nord4);
	}
</style>

{#if mounted && pwaStore.isStandalone}
	<div class="offline-sync">
		<button
			class="sync-button"
			class:syncing={pwaStore.isSyncing}
			class:available={pwaStore.isOfflineAvailable}
			onclick={() => showTooltip = !showTooltip}
			title={pwaStore.isOfflineAvailable ? labels.offlineReady : labels.syncForOffline}
		>
			<svg class="sync-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				{#if pwaStore.isOfflineAvailable}
					<!-- Checkmark icon when offline data is available -->
					<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
				{:else}
					<!-- Download icon when no offline data -->
					<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
				{/if}
			</svg>
		</button>

		{#if showTooltip}
			<div class="tooltip">
				<div class="tooltip-content">
					{#if pwaStore.isOfflineAvailable}
						<div class="status ready">{labels.offlineReady}</div>
						<div class="meta">
							{pwaStore.recipeCount} {labels.recipes}
							{#if pwaStore.lastSyncDate}
								<br>{labels.lastSync}: {formatDate(pwaStore.lastSyncDate)}
							{/if}
						</div>
						<button
							class="tooltip-button"
							onclick={handleSync}
							disabled={pwaStore.isSyncing}
						>
							{pwaStore.isSyncing ? labels.syncing : labels.syncNow}
						</button>
						<button
							class="tooltip-button clear"
							onclick={handleClear}
							disabled={pwaStore.isSyncing}
						>
							{labels.clearData}
						</button>
					{:else}
						<div class="status">{labels.syncForOffline}</div>
						<button
							class="tooltip-button"
							onclick={handleSync}
							disabled={pwaStore.isSyncing}
						>
							{pwaStore.isSyncing ? labels.syncing : labels.syncForOffline}
						</button>
					{/if}

					{#if pwaStore.error}
						<div class="status" style="color: var(--nord11);">
							{pwaStore.error}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}
