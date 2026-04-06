<script>
	import { Cloud, CloudOff, RefreshCw, AlertTriangle } from '@lucide/svelte';

	/** @type {{ status: string }} */
	let { status } = $props();
</script>

<span class="sync-indicator" class:synced={status === 'synced'} class:syncing={status === 'syncing'} class:offline={status === 'offline'} class:conflict={status === 'conflict'} title={status === 'synced' ? 'Synced across devices' : status === 'syncing' ? 'Syncing...' : status === 'offline' ? 'Offline — changes saved locally' : status === 'conflict' ? 'Resolving conflict...' : ''}>
	{#if status === 'synced'}
		<Cloud size={14} />
	{:else if status === 'syncing'}
		<RefreshCw size={14} class="spin" />
	{:else if status === 'offline'}
		<CloudOff size={14} />
	{:else if status === 'conflict'}
		<AlertTriangle size={14} />
	{/if}
</span>

<style>
	.sync-indicator {
		display: inline-flex;
		align-items: center;
		opacity: 0.5;
		transition: opacity 0.2s;
	}
	.synced {
		color: var(--nord14);
		opacity: 0.7;
	}
	.syncing {
		color: var(--nord13);
		opacity: 0.8;
	}
	.offline {
		color: var(--color-text-secondary);
		opacity: 0.5;
	}
	.conflict {
		color: var(--nord12);
		opacity: 0.9;
	}
	.sync-indicator :global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
