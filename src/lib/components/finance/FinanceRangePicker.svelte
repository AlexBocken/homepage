<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang } from '$lib/js/financesI18n';

	// Ledger bounds (YYYY-MM-DD) for the date-picker limits and the "Alles" range.
	let { min, max }: { min: string; max: string } = $props();

	const lang = $derived(financesLang(languageStore.value));
	const t = $derived(m[lang]);

	const curFrom = $derived(page.url.searchParams.get('from') ?? '');
	const curTo = $derived(page.url.searchParams.get('to') ?? '');

	function monthsBack(iso: string, n: number): string {
		const d = new Date(iso + 'T00:00:00');
		d.setMonth(d.getMonth() - n);
		const back = d.toISOString().slice(0, 10);
		return back < min ? min : back;
	}

	const presets = $derived([
		{ key: '3m', label: '3M', from: monthsBack(max, 3), to: '' },
		{ key: '6m', label: '6M', from: monthsBack(max, 6), to: '' },
		{ key: '12m', label: t.range_1y, from: monthsBack(max, 12), to: '' },
		{ key: 'ytd', label: 'YTD', from: max.slice(0, 4) + '-01-01', to: '' },
		// Full history is explicit (from=ledger start) so it's distinct from the
		// default (no params), which the sidecar treats as the last 12 months.
		{ key: 'all', label: t.range_all, from: min, to: '' }
	]);

	// No params → the 12-month default; otherwise match a preset (else custom).
	const activeKey = $derived(
		!curFrom && !curTo
			? '12m'
			: (presets.find((p) => p.from === curFrom && p.to === curTo)?.key ?? 'custom')
	);

	function apply(from: string, to: string) {
		const url = new URL(page.url);
		if (from) url.searchParams.set('from', from);
		else url.searchParams.delete('from');
		if (to) url.searchParams.set('to', to);
		else url.searchParams.delete('to');
		goto(url, { keepFocus: true, noScroll: true });
	}

	// Local values for the custom pickers, kept in sync with the URL.
	let cFrom = $state('');
	let cTo = $state('');
	$effect(() => {
		// Seed the custom pickers with the effective range (12-month default).
		cFrom = curFrom || monthsBack(max, 12);
		cTo = curTo || max;
	});
</script>

<div class="range">
	<div class="presets" role="group" aria-label={t.period}>
		{#each presets as p (p.key)}
			<button class:active={activeKey === p.key} onclick={() => apply(p.from, p.to)}>{p.label}</button>
		{/each}
	</div>
	<div class="custom" class:active={activeKey === 'custom'}>
		<DatePicker bind:value={cFrom} {min} max={cTo || max} {lang} fontSize="0.8rem" onchange={() => apply(cFrom, cTo)} />
		<span class="dash">–</span>
		<DatePicker bind:value={cTo} min={cFrom || min} {max} {lang} fontSize="0.8rem" onchange={() => apply(cFrom, cTo)} />
	</div>
</div>

<style>
	.range {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem 1rem;
		margin-bottom: 1.5rem;
	}
	.presets {
		display: inline-flex;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		padding: 0.2rem;
	}
	.presets button {
		border: none;
		background: none;
		cursor: pointer;
		padding: 0.3rem 0.7rem;
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		transition: all var(--transition-fast);
	}
	.presets button.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.custom {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		opacity: 0.75;
		transition: opacity var(--transition-fast);
	}
	.custom.active {
		opacity: 1;
	}
	.dash {
		color: var(--color-text-tertiary);
	}
</style>
