<script lang="ts">
import { browser } from '$app/environment';
import { getAngelusStreak, getCurrentTimeSlot, type TimeSlot } from '$lib/stores/angelusStreak.svelte';
import StreakAura from '$lib/components/faith/StreakAura.svelte';
import { Coffee, Sun, Moon } from '@lucide/svelte';
import { tick, onMount } from 'svelte';

let burst = $state(false);
let store = $state<ReturnType<typeof getAngelusStreak> | null>(null);
let selectedSlot = $state<TimeSlot>('morning');

interface Props {
	streakData?: { streak: number; lastComplete: string | null; todayPrayed: number; todayDate: string | null } | null;
	lang?: 'de' | 'en' | 'la';
	isLoggedIn?: boolean;
}

let { streakData = null, lang = 'de', isLoggedIn = false }: Props = $props();

const isEnglish = $derived(lang === 'en');
const isLatin = $derived(lang === 'la');

// Display values: store when available, SSR fallback
const displayStreak = $derived(store?.streak ?? streakData?.streak ?? 0);
const todayPrayed = $derived(store?.todayPrayed ?? (() => {
	if (!streakData || streakData.todayDate !== new Date().toISOString().split('T')[0]) return 0;
	return streakData.todayPrayed;
})());
const todayComplete = $derived(todayPrayed === 7);
const selectedSlotPrayed = $derived(isSlotPrayed(selectedSlot));

// Count bits set in todayPrayed for fractional display
const partialCount = $derived(
	((todayPrayed & 1) + ((todayPrayed >> 1) & 1) + ((todayPrayed >> 2) & 1))
);
const showFraction = $derived(partialCount > 0 && partialCount < 3);

const SLOT_ORDER: TimeSlot[] = ['morning', 'noon', 'evening'];

function pickFirstUnprayed(prayedMask: number): TimeSlot {
	const current = browser ? getCurrentTimeSlot() : 'morning';
	const bit = (s: TimeSlot) => ({ morning: 1, noon: 2, evening: 4 }[s]);
	if ((prayedMask & bit(current)) === 0) return current;
	return SLOT_ORDER.find(s => (prayedMask & bit(s)) === 0) ?? current;
}

const slots: { key: TimeSlot; icon: typeof Coffee; color: string }[] = [
	{ key: 'morning', icon: Coffee, color: 'var(--nord13)' },
	{ key: 'noon', icon: Sun, color: 'var(--nord12)' },
	{ key: 'evening', icon: Moon, color: 'var(--nord15)' }
];

const labels = $derived({
	days: isLatin ? 'Dies' : isEnglish ? (displayStreak === 1 && !showFraction ? 'Day' : 'Days') : (displayStreak === 1 && !showFraction ? 'Tag' : 'Tage'),
	pray: isLatin ? 'Oravi' : isEnglish ? 'Prayed' : 'Gebetet',
	done: isLatin ? 'Hodie completa' : isEnglish ? 'Done today' : 'Heute fertig',
	morning: isLatin ? 'Mane' : isEnglish ? 'Morning' : 'Morgens',
	noon: isLatin ? 'Meridie' : isEnglish ? 'Noon' : 'Mittags',
	evening: isLatin ? 'Vespere' : isEnglish ? 'Evening' : 'Abends',
	ariaLabel: isLatin ? 'Orationem notatam fac' : isEnglish ? 'Mark prayer as prayed' : 'Gebet als gebetet markieren'
});

const slotLabels: Record<TimeSlot, string> = $derived({
	morning: labels.morning,
	noon: labels.noon,
	evening: labels.evening
});

function isSlotPrayed(slot: TimeSlot): boolean {
	const bits: Record<TimeSlot, number> = { morning: 1, noon: 2, evening: 4 };
	return (todayPrayed & bits[slot]) !== 0;
}

function selectSlot(slot: TimeSlot) {
	if (!isSlotPrayed(slot)) {
		selectedSlot = slot;
	}
}

onMount(() => {
	const s = getAngelusStreak();
	s.initWithServerData(streakData, isLoggedIn);
	store = s;
	selectedSlot = pickFirstUnprayed(s.todayPrayed);
});

async function pray() {
	if (!store || isSlotPrayed(selectedSlot)) return;
	const completed = await store.recordPrayer(selectedSlot);
	selectedSlot = pickFirstUnprayed(store.todayPrayed);
	if (completed) {
		burst = true;
		await tick();
		setTimeout(() => burst = false, 700);
	}
}
</script>

<div class="angelus-streak">
	<div class="streak-display">
		<StreakAura value={displayStreak} {burst}>
			<span class="number">
				{displayStreak}{#if showFraction}<span class="fraction"><span class="num">{partialCount}</span><span class="slash">/</span><span class="den">3</span></span>{/if}
			</span>
		</StreakAura>
		<span class="streak-label">{labels.days}</span>
	</div>

	<div class="prayer-controls">
		<div class="time-slots">
			{#each slots as slot}
				<button
					class="slot-dot"
					class:prayed={isSlotPrayed(slot.key)}
					class:selected={slot.key === selectedSlot && !isSlotPrayed(slot.key)}
					disabled={isSlotPrayed(slot.key)}
					title={slotLabels[slot.key]}
					aria-label={slotLabels[slot.key]}
					style="--slot-color: {slot.color}"
					onclick={() => selectSlot(slot.key)}
				>
					<slot.icon size={18} />
				</button>
			{/each}
		</div>

		<form method="POST" action="?/pray-angelus" onsubmit={(e) => { e.preventDefault(); pray(); }}>
			<input type="hidden" name="time" value={selectedSlot} />
			<button
				class="pray-button"
				type="submit"
				disabled={todayComplete || selectedSlotPrayed}
				aria-label={labels.ariaLabel}
			>
				{#if todayComplete}
					{labels.done}
				{:else}
					{labels.pray}
				{/if}
			</button>
		</form>
	</div>
</div>

<style>
.angelus-streak {
	display: flex;
	align-items: center;
	gap: 1.5rem;
	padding: 1rem 1.5rem;
	background: var(--color-surface);
	border-radius: 12px;
	width: fit-content;
	margin: 1.5rem auto;
}

.streak-display {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.streak-label {
	font-size: 0.85rem;
	color: var(--color-text-secondary);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.number {
	position: relative;
	z-index: 5;
	font-size: 2.5rem;
	font-weight: 700;
	color: var(--nord13);
}

.fraction {
	font-size: 0.45em;
	font-weight: 600;
	position: relative;
	top: -0.15em;
	margin-left: 0.05em;
}

.fraction .num {
	position: relative;
	top: -0.35em;
}

.fraction .slash {
	margin: 0 0.01em;
}

.fraction .den {
	position: relative;
	top: 0.15em;
}

.prayer-controls {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.75rem;
}

.time-slots {
	display: flex;
	gap: 0.5rem;
}

.slot-dot {
	width: 40px;
	height: 40px;
	border-radius: 50%;
	border: 2px solid var(--color-border);
	background: transparent;
	color: var(--color-text-secondary);
	cursor: pointer;
	display: grid;
	place-items: center;
	transition: all 0.3s ease;
	padding: 0;
	opacity: 0.5;
}

.slot-dot.selected {
	border-color: var(--slot-color);
	color: var(--slot-color);
	opacity: 1;
}

.slot-dot.prayed {
	border-color: var(--slot-color);
	background: var(--slot-color);
	color: white;
	cursor: default;
	opacity: 1;
}

.slot-dot:hover:not(:disabled) {
	border-color: var(--slot-color);
	opacity: 0.85;
	transform: scale(1.1);
}

.pray-button {
	padding: 0.6rem 1.5rem;
	border: none;
	border-radius: 8px;
	background: var(--blue);
	color: white;
	font-size: 1rem;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.2s ease;
	min-width: 120px;
}

.pray-button:hover:not(:disabled) {
	background: var(--nord10);
	transform: translateY(-2px);
}

.pray-button:disabled {
	background: var(--blue);
	cursor: default;
	opacity: 0.5;
}
</style>
