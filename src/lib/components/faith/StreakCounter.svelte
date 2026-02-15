<script lang="ts">
import { browser } from '$app/environment';
import { getRosaryStreak } from '$lib/stores/rosaryStreak.svelte';
import StreakAura from '$lib/components/faith/StreakAura.svelte';
import { tick, onMount } from 'svelte';

let burst = $state(false);
let streak = $state<ReturnType<typeof getRosaryStreak> | null>(null);

interface Props {
	streakData?: { length: number; lastPrayed: string | null } | null;
	lang?: 'de' | 'en';
	isLoggedIn?: boolean;
}

let { streakData = null, lang = 'de', isLoggedIn = false }: Props = $props();

const isEnglish = $derived(lang === 'en');

// Derive display values: use store when available, fall back to server data for SSR
let displayLength = $derived(streak?.length ?? streakData?.length ?? 0);
let prayedToday = $derived(streak?.prayedToday ?? (streakData?.lastPrayed === new Date().toISOString().split('T')[0]));

// Labels need to come after displayLength since they depend on it
const labels = $derived({
	days: isEnglish ? (displayLength === 1 ? 'Day' : 'Days') : (displayLength === 1 ? 'Tag' : 'Tage'),
	prayed: isEnglish ? 'Prayed' : 'Gebetet',
	prayedToday: isEnglish ? 'Prayed today' : 'Heute gebetet',
	ariaLabel: isEnglish ? 'Mark prayer as prayed' : 'Gebet als gebetet markieren'
});

// Initialize store on mount (client-side only)
// Init with server data BEFORE assigning to streak, so displayLength
// never sees stale localStorage data from the singleton
onMount(() => {
	const s = getRosaryStreak();
	s.initWithServerData(streakData, isLoggedIn);
	streak = s;
});

async function pray() {
	burst = true;
	await tick();
	setTimeout(() => burst = false, 700);
	streak?.recordPrayer();
}
</script>

<div class="streak-container" class:no-js-hidden={!isLoggedIn}>
	<div class="streak-display">
		<StreakAura value={displayLength} {burst} />
		<span class="streak-label">{labels.days}</span>
	</div>
	<form method="POST" action="?/pray" onsubmit={(e) => { e.preventDefault(); pray(); }}>
		<button
			class="streak-button"
			type="submit"
			disabled={prayedToday}
			aria-label={labels.ariaLabel}
		>
			{#if prayedToday}
				{labels.prayedToday}
			{:else}
				{labels.prayed}
			{/if}
		</button>
	</form>
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

/* Hide for non-logged-in users without JS (no form action available) */
.no-js-hidden {
	display: none;
}

:global(html.js-enabled) .no-js-hidden {
	display: flex;
}

@media (prefers-color-scheme: light) {
	.streak-button:disabled {
		background: var(--nord4);
	}
}
</style>
