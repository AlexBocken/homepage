<script lang="ts">
	import X from '@lucide/svelte/icons/x';

	let { open = $bindable(false), hasSupercard = false, hasCumulus = false } = $props<{
		open?: boolean;
		hasSupercard?: boolean;
		hasCumulus?: boolean;
	}>();

	function close() { open = false; }

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={close}>
		<div class="modal" role="dialog" aria-modal="true" aria-label="Kundenkarten" tabindex="-1" onclick={(e) => e.stopPropagation()}>
			<button class="close" onclick={close} aria-label="Schliessen">
				<X size={18} />
			</button>

			{#if hasSupercard}
				<article class="card supercard">
					<header>
						<span class="brand">SUPERCARD</span>
						<span class="sub">Coop</span>
					</header>
					<div class="barcode barcode-square">
						<img src="/shopping/supercard.svg" alt="Supercard Data Matrix" />
					</div>
				</article>
			{/if}

			{#if hasCumulus}
				<article class="card cumulus">
					<header>
						<span class="brand">CUMULUS</span>
						<span class="sub">Migros</span>
					</header>
					<div class="barcode barcode-linear">
						<img src="/shopping/cumulus.svg" alt="Cumulus barcode" />
					</div>
				</article>
			{/if}

			{#if !hasSupercard && !hasCumulus}
				<p class="empty">Keine Karten konfiguriert.</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.modal {
		position: relative;
		background: var(--color-bg-secondary);
		border-radius: 20px;
		padding: 1.25rem;
		width: 100%;
		max-width: 420px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.close {
		position: absolute;
		top: 0.6rem;
		right: 0.6rem;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		border-radius: 50%;
		background: rgba(0, 0, 0, 0.15);
		color: white;
		cursor: pointer;
		z-index: 1;
	}
	.close:hover { background: rgba(0, 0, 0, 0.3); }

	.card {
		border-radius: 16px;
		padding: 1rem 1.1rem 1.1rem;
		color: white;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
	}
	.supercard {
		background: linear-gradient(135deg, #0a6fc2 0%, #055a9e 100%);
	}
	.cumulus {
		background: linear-gradient(135deg, #ff6a00 0%, #e55300 100%);
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.brand {
		font-weight: 800;
		font-size: 1.25rem;
		letter-spacing: 0.08em;
	}
	.sub {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.14em;
		opacity: 0.85;
	}

	.barcode {
		background: white;
		border-radius: 10px;
		padding: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.barcode-square img {
		width: min(220px, 60%);
		height: auto;
		display: block;
	}
	.barcode-linear img {
		width: 100%;
		height: auto;
		max-height: 90px;
		display: block;
	}

	.empty {
		text-align: center;
		color: var(--color-text-secondary);
		margin: 1rem 0;
		font-size: 0.9rem;
	}
</style>
