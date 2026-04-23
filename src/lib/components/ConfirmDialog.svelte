<script>
	import { getConfirmDialog } from '$lib/js/confirmDialog.svelte';

	const dialog = getConfirmDialog();

	/** @param {KeyboardEvent} e */
	function onKeydown(e) {
		if (!dialog.open) return;
		if (e.key === 'Escape') dialog.respond(false);
		if (e.key === 'Enter') dialog.respond(true);
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if dialog.open}
	<div class="confirm-backdrop" onclick={() => dialog.respond(false)} role="presentation">
		<div
			class="confirm-dialog"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="alertdialog"
			aria-modal="true"
			tabindex="-1"
		>
			{#if dialog.title}
				<h3 class="confirm-title">{dialog.title}</h3>
			{/if}
			<p class="confirm-message">{dialog.message}</p>
			<div class="confirm-actions">
				<button class="confirm-btn cancel" onclick={() => dialog.respond(false)}>
					{dialog.cancelText}
				</button>
				<button
					class="confirm-btn confirm"
					class:destructive={dialog.destructive}
					onclick={() => dialog.respond(true)}
				>
					{dialog.confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.confirm-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		z-index: 10000;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fade-in 150ms ease-out;
	}
	.confirm-dialog {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 12px;
		padding: 1.25rem 1.5rem;
		max-width: 360px;
		width: calc(100vw - 2rem);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
		animation: scale-in 150ms ease-out;
	}
	.confirm-title {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-text-primary);
	}
	.confirm-message {
		margin: 0 0 1.25rem;
		font-size: 0.85rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}
	.confirm-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.confirm-btn {
		padding: 0.45rem 1rem;
		border-radius: 8px;
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		border: none;
		transition: opacity 150ms;
	}
	.confirm-btn:hover {
		opacity: 0.85;
	}
	.confirm-btn.cancel {
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
	}
	.confirm-btn.confirm {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.confirm-btn.confirm.destructive {
		background: var(--nord11);
		color: white;
	}
	@keyframes fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	@keyframes scale-in {
		from { opacity: 0; transform: scale(0.95); }
		to { opacity: 1; transform: scale(1); }
	}
</style>
