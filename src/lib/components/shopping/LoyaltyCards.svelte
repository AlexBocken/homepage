<script lang="ts">
	import X from '@lucide/svelte/icons/x';

	type CardType = 'supercard' | 'cumulus' | null;

	let { card = $bindable(null), hasSupercard = false, hasCumulus = false } = $props<{
		card?: CardType;
		hasSupercard?: boolean;
		hasCumulus?: boolean;
	}>();

	function close() { card = null; }

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	const showSupercard = $derived(card === 'supercard' && hasSupercard);
	const showCumulus = $derived(card === 'cumulus' && hasCumulus);
</script>

<svelte:window onkeydown={onKeydown} />

{#if card}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="backdrop" onclick={close}>
		<div
			class="modal"
			class:is-supercard={showSupercard}
			class:is-cumulus={showCumulus}
			role="dialog"
			aria-modal="true"
			aria-label={showSupercard ? 'Coop Supercard' : 'Migros Cumulus'}
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
		>
			<button class="close-button" onclick={close} aria-label="Schliessen">
				<X />
			</button>

			{#if showSupercard}
				<div class="brand-head">
					<span class="brand">SUPERCARD</span>
					<span class="sub">Coop</span>
				</div>
				<div class="barcode barcode-square">
					<img src="/shopping/supercard.svg" alt="Supercard Data Matrix" />
				</div>
			{:else if showCumulus}
				<div class="brand-head">
					<span class="brand">CUMULUS</span>
					<span class="sub">Migros</span>
				</div>
				<div class="barcode barcode-linear">
					<img src="/shopping/cumulus.svg" alt="Cumulus barcode" />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.65);
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal {
		position: relative;
		border-radius: 24px;
		padding: 1.5rem 1.25rem 1.25rem;
		width: 100%;
		max-width: 440px;
		color: white;
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.modal.is-supercard {
		background: linear-gradient(135deg, #0a6fc2 0%, #055a9e 100%);
	}
	.modal.is-cumulus {
		background: linear-gradient(135deg, #ff6a00 0%, #e55300 100%);
	}

	/* Red cross button — same pattern as BibleModal */
	.close-button {
		position: absolute;
		top: -1rem;
		right: -1rem;
		background-color: var(--nord11);
		border: none;
		cursor: pointer;
		padding: 0.75rem;
		border-radius: var(--radius-pill);
		color: white;
		transition: var(--transition-normal);
		box-shadow: 0 0 1em 0.2em rgba(0, 0, 0, 0.35);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}
	.close-button :global(svg) {
		width: 1.5rem;
		height: 1.5rem;
	}
	.close-button:hover {
		background-color: var(--nord0);
		transform: scale(1.1);
		box-shadow: 0 0 1em 0.4em rgba(0, 0, 0, 0.35);
	}
	.close-button:active {
		transition: 50ms;
		scale: 0.9 0.9;
	}

	.brand-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0 0.25rem;
	}
	.brand {
		font-weight: 800;
		font-size: 1.4rem;
		letter-spacing: 0.1em;
	}
	.sub {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.16em;
		opacity: 0.9;
	}

	.barcode {
		background: white;
		border-radius: 14px;
		padding: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.barcode img {
		display: block;
		image-rendering: pixelated; /* crisp barcode modules at any scale */
	}
	.barcode-square img {
		width: 100%;
		max-width: 360px;
		height: auto;
		aspect-ratio: 1 / 1;
	}
	.barcode-linear img {
		width: 100%;
		height: auto;
		min-height: 140px;
		max-height: 30vh;
	}

	@media (max-width: 480px) {
		.backdrop { padding: 0.5rem; }
		.modal { padding: 1.25rem 1rem 1rem; border-radius: 20px; }
		.brand { font-size: 1.25rem; }
		.barcode { padding: 0.75rem; }
		.barcode-square img { max-width: none; }
		.barcode-linear img { min-height: 160px; }
	}
</style>
