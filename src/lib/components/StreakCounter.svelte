<script lang="ts">
import { browser } from '$app/environment';
import { getRosaryStreak } from '$lib/stores/rosaryStreak.svelte';
import StreakAura from '$lib/components/StreakAura.svelte';
import { tick, onMount } from 'svelte';

let burst = $state(false);
let streak = $state<ReturnType<typeof getRosaryStreak> | null>(null);

interface Props {
	streakData?: { length: number; lastPrayed: string | null } | null;
}

let { streakData = null }: Props = $props();

// Derive display values: use store when available, fall back to server data for SSR
let displayLength = $derived(streak?.length ?? streakData?.length ?? 0);
let prayedToday = $derived(streak?.prayedToday ?? (streakData?.lastPrayed === new Date().toISOString().split('T')[0]));

// Initialize store on mount (client-side only)
onMount(() => {
	streak = getRosaryStreak();
	streak.initWithServerData(streakData, streakData !== null);
});

async function pray() {
	burst = true;
	await tick();
	setTimeout(() => burst = false, 700);
	streak?.recordPrayer();
}
</script>

<div class="streak-container">
	<div class="streak-display">
		<StreakAura value={displayLength} {burst} />
		<span class="streak-label">Tag{#if displayLength !== 1}e{/if}</span>
	</div>
	<button
		class="streak-button"
		onclick={pray}
  		disabled={prayedToday}
		aria-label="Gebet als gebetet markieren"
	>
		{#if prayedToday}
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
