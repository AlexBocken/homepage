<script lang="ts">
import { browser } from '$app/environment';
import { getRosaryStreak } from '$lib/stores/rosaryStreak.svelte';

const streak = browser ? getRosaryStreak() : null;
</script>

<div class="streak-container">
	<div class="streak-display">
		<span class="streak-number">{streak?.length ?? 0}</span>
		<span class="streak-label">Tage</span>
	</div>
	<button
		class="streak-button"
		onclick={() => streak?.recordPrayer()}
		disabled={streak?.prayedToday}
		aria-label="Gebet als gebetet markieren"
	>
		{#if streak?.prayedToday}
			Heute gebetet
		{:else}
			Gebetet
		{/if}
	</button>
</div>

<style>
.streak-container {
	display: flex;
	align-items: center;
	gap: 1.5rem;
	padding: 1rem 1.5rem;
	background: var(--nord1);
	border-radius: 12px;
	width: fit-content;
}

@media (prefers-color-scheme: light) {
	.streak-container {
		background: var(--nord5);
	}
}

.streak-display {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.streak-number {
	font-size: 2.5rem;
	font-weight: 700;
	color: var(--nord13);
	line-height: 1;
}

.streak-label {
	font-size: 0.85rem;
	color: var(--nord4);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

@media (prefers-color-scheme: light) {
	.streak-label {
		color: var(--nord3);
	}
}

.streak-button {
	padding: 0.75rem 1.5rem;
	border: none;
	border-radius: 8px;
	background: var(--nord10);
	color: white;
	font-size: 1rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
}

.streak-button:hover:not(:disabled) {
	background: var(--nord9);
	transform: translateY(-2px);
}

.streak-button:disabled {
	background: var(--nord3);
	cursor: default;
	opacity: 0.7;
}

@media (prefers-color-scheme: light) {
	.streak-button:disabled {
		background: var(--nord4);
	}
}
</style>
