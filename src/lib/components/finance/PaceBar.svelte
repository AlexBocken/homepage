<script lang="ts">
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';

	// A budget bar that also shows *pace*: the fill is spent/budget, and a thin
	// tick marks where you'd be at this point in the period. Fill past the tick =
	// spending too fast. Colour follows status (ok / watch / over).
	let {
		spent,
		budget,
		pace = 0,
		status = 'ok',
		height = '0.7rem'
	}: {
		spent: number | null;
		budget: number | null;
		pace?: number;
		status?: 'ok' | 'watch' | 'over';
		height?: string;
	} = $props();

	const frac = $derived(budget && budget > 0 ? Math.min((spent ?? 0) / budget, 1) : 0);
	const color = $derived(
		status === 'over' ? 'var(--red)' : status === 'watch' ? 'var(--orange)' : 'var(--green)'
	);
	const t = $derived(m[financesLang(languageStore.value)]);
	const paceLabel = $derived(`${t.pb_pace_a}${Math.round(pace * 100)}${t.pb_pace_b}`);
</script>

<div class="pb" style="height: {height}">
	<span class="pb-fill" style="width: {frac * 100}%; background: {color}"></span>
	{#if pace > 0 && pace < 1}
		<span class="pb-pace" style="left: {pace * 100}%" title={paceLabel}></span>
	{/if}
</div>

<style>
	.pb {
		position: relative;
		width: 100%;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}
	.pb-fill {
		position: absolute;
		inset: 0 auto 0 0;
		border-radius: var(--radius-pill);
		transition: width var(--transition-normal);
	}
	.pb-pace {
		position: absolute;
		top: -2px;
		bottom: -2px;
		width: 2px;
		transform: translateX(-1px);
		background: var(--color-text-primary);
		opacity: 0.55;
	}
</style>
