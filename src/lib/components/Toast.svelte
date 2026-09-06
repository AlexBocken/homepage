<script>
	import X from '@lucide/svelte/icons/x';
	import { getToasts } from '$lib/js/toast.svelte';

	const toasts = getToasts();
</script>

{#if toasts.items.length > 0}
	<div class="toast-container">
		{#each toasts.items as t (t.id)}
			<div class="toast toast-{t.type}" role="alert">
				<span class="toast-msg">{t.message}</span>
				{#if t.action}
					<button class="toast-action" onclick={() => { t.action?.run(); toasts.remove(t.id); }}>{t.action.label}</button>
				{/if}
				<button class="toast-close" onclick={() => toasts.remove(t.id)} aria-label="Dismiss">
					<X size={14} />
				</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		bottom: 5rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: max-content;
		max-width: calc(100vw - 2rem);
		pointer-events: none;
	}
	.toast {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		border-radius: 8px;
		font-size: 0.85rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
		pointer-events: auto;
		animation: slide-up 0.2s ease-out;
	}
	.toast-error {
		background: var(--nord11);
		color: var(--nord6, #eceff4);
	}
	.toast-success {
		background: var(--nord14);
		color: var(--nord0, #2e3440);
	}
	.toast-info {
		background: var(--nord10);
		color: var(--nord6, #eceff4);
	}
	.toast-msg {
		flex: 1;
	}
	.toast-action {
		background: none;
		border: 0;
		padding: 0 0.25rem;
		color: inherit;
		font: inherit;
		font-weight: 600;
		text-decoration: underline;
		text-underline-offset: 2px;
		cursor: pointer;
	}
	.toast-close {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		padding: 2px;
		opacity: 0.7;
		display: flex;
	}
	.toast-close:hover {
		opacity: 1;
	}
	@keyframes slide-up {
		from { opacity: 0; transform: translateY(0.5rem); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
