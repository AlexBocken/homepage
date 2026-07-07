<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { money, percent, units as fmtUnits, gainClass } from '$lib/utils/finance';
	import type { Holding, Investments } from '$lib/utils/finance';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m as financesM, financesLang } from '$lib/js/financesI18n';
	import type { PageData } from './$types';

	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import TrendingDown from '@lucide/svelte/icons/trending-down';
	import ChartLine from '@lucide/svelte/icons/chart-line';
	import Layers from '@lucide/svelte/icons/layers';

	let { data }: { data: PageData } = $props();
	const inv: Investments = $derived(data.investments);
	const tot = $derived(inv.totals);
	const t = $derived(financesM[financesLang(languageStore.value)]);

	// Select a holding to open its per-stock deep dive.
	function open(commodity: string) {
		goto(resolve('/finances/investments/[commodity]', { commodity }));
	}

	const PALETTE = [
		'#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#b07aa1', '#76b7b2',
		'#edc948', '#ff9da7', '#9c755f', '#bab0ac'
	];

	// Cumulative profit/loss over time — green line/fill above zero, red below.
	const GREEN = '#A3BE8C';
	const RED = '#BF616A';

	// Insert an interpolated (x, 0) point at every zero crossing so each straight
	// segment lies entirely on one side of the axis — otherwise a segment that
	// spans zero gets drawn in a single colour and bleeds across the baseline.
	const plPoints = $derived.by(() => {
		const dates: string[] = [];
		const data: (number | null)[] = [];
		const s = inv.pl_series;
		for (let i = 0; i < s.length; i++) {
			dates.push(s[i].date);
			data.push(s[i].pl);
			const a = s[i].pl;
			const b = s[i + 1]?.pl;
			if (a != null && b != null && a !== b && a < 0 !== b < 0) {
				const t = a / (a - b); // fraction along the segment where y = 0
				const t0 = new Date(s[i].date + 'T00:00:00').getTime();
				const t1 = new Date(s[i + 1].date + 'T00:00:00').getTime();
				dates.push(new Date(t0 + t * (t1 - t0)).toISOString());
				data.push(0);
			}
		}
		return { dates, data };
	});

	// Colour a point (incl. the hover marker) by the sign of its value.
	const pointColor = (ctx: { parsed?: { y: number } }) => ((ctx.parsed?.y ?? 0) < 0 ? RED : GREEN);

	const plData = $derived({
		dates: plPoints.dates,
		datasets: [
			{
				label: t.inv_cum_pl_short,
				data: plPoints.data,
				borderColor: GREEN,
				// colour each line segment by sign (ctx is Chart.js's segment context)
				segment: {
					borderColor: (ctx: { p0?: { parsed: { y: number } }; p1?: { parsed: { y: number } } }) =>
						(ctx.p0?.parsed?.y ?? 0) < 0 || (ctx.p1?.parsed?.y ?? 0) < 0 ? RED : GREEN
				},
				// fill to the zero baseline, green above / red below
				fill: { target: 'origin', above: 'rgba(163,190,140,0.18)', below: 'rgba(191,97,106,0.15)' } as unknown as boolean,
				borderWidth: 2,
				pointRadius: 0,
				// the hover marker and its border follow the sign too
				pointBackgroundColor: pointColor as unknown as string,
				pointHoverBackgroundColor: pointColor,
				pointBorderColor: pointColor,
				pointHoverBorderColor: pointColor,
				tension: 0
			}
		]
	});

	// Each holding rebased to % return (server-aligned to one date axis), plus any
	// benchmarks overlaid as thick dashed lines.
	const perfData = $derived({
		dates: inv.performance.dates,
		datasets: [
			...inv.performance.series.map((s, i) => ({
				label: s.commodity,
				data: s.pct,
				borderColor: PALETTE[i % PALETTE.length],
				backgroundColor: 'transparent',
				borderWidth: 2,
				pointRadius: 0,
				tension: 0.1,
				fill: false
			})),
			...(inv.performance.benchmarks ?? []).map((b) => ({
				label: b.commodity,
				data: b.pct,
				borderColor: '#4C566A',
				backgroundColor: 'transparent',
				borderWidth: 3,
				borderDash: [6, 4],
				pointRadius: 0,
				tension: 0.1,
				fill: false
			}))
		]
	});
	const hasBenchmark = $derived((inv.performance.benchmarks ?? []).length > 0);

	// Remount FitnessChart when the range (URL) changes — it doesn't sync data.
	const chartKey = $derived(page.url.search);

	// Allocation by asset class (market value).
	const allocation = $derived.by(() => {
		const by: Record<string, number> = {};
		for (const h of inv.holdings) {
			const k = h.asset_class ?? 'other';
			by[k] = (by[k] ?? 0) + (h.market_chf ?? 0);
		}
		return Object.entries(by).sort((a, b) => b[1] - a[1]);
	});
	const classColors: Record<string, string> = {
		stock: '#5E81AC',
		pension: '#A3BE8C',
		cash: '#EBCB8B',
		bond: '#B48EAD'
	};
	const classColor = (k: string) => classColors[k] ?? '#D08770';
	const allocTotal = $derived(allocation.reduce((s, [, v]) => s + v, 0) || 1);

	const gainOf = (h: Holding) => h.gain_chf;
</script>

<svelte:head><title>{t.title_investments}</title></svelte:head>

<!-- KPIs -->
<section class="kpis">
	<div class="kpi big">
		<span class="label">{t.market_value}</span>
		<span class="figure">{money(tot.market_chf)}</span>
	</div>
	<div class="kpi">
		<span class="label">{t.inv_invested}</span>
		<span class="figure">{money(tot.cost_chf)}</span>
	</div>
	<div class="kpi">
		<span class="label">{t.inv_gain_loss}</span>
		<span class="figure trend {gainClass(tot.gain_chf)}">
			{#if (tot.gain_chf ?? 0) >= 0}<TrendingUp size={18} strokeWidth={2} />{:else}<TrendingDown size={18} strokeWidth={2} />{/if}
			{money(tot.gain_chf)} ({percent(tot.gain_pct)})
		</span>
	</div>
	<div class="kpi">
		<span class="label" title={t.inv_xirr_tip}>XIRR p.a.</span>
		<span class="figure {gainClass(tot.xirr_pct)}">{percent(tot.xirr_pct)}</span>
	</div>
	<div class="kpi">
		<span class="label" title={t.inv_twr_tip}>TWR p.a.</span>
		<span class="figure {gainClass(tot.twr_pct)}">{percent(tot.twr_pct)}</span>
	</div>
	<div class="kpi">
		<span class="label" title={t.inv_div_tip}>{t.dividends}</span>
		<span class="figure">{money(tot.dividends_chf)}</span>
	</div>
</section>

<!-- Cumulative P/L (hero) -->
<section class="card">
	<h2><TrendingUp size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.inv_cum_pl}</h2>
	{#key chartKey}
		<FitnessChart
			type="line"
			height="300px"
			data={plData}
			tooltipFormatter={(v: number) => money(v, true)}
			tooltipLabelColor={(v: number) => (v < 0 ? RED : GREEN)}
		/>
	{/key}
</section>

<!-- Price performance -->
<section class="card">
	<h2><ChartLine size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.inv_price_perf} <span class="hint">{t.inv_rebased}{hasBenchmark ? t.inv_benchmark_dashed : ''}</span></h2>
	{#key chartKey}
		<FitnessChart type="line" height="300px" data={perfData} tooltipFormatter={(v: number) => `${v.toFixed(1)} %`} />
	{/key}
</section>

<!-- Holdings + allocation -->
<section class="card">
	<h2><Layers size={18} strokeWidth={1.75} color="var(--color-text-tertiary)" /> {t.inv_positions}</h2>

	<div class="alloc-bar">
		{#each allocation as [cls, val] (cls)}
			<span class="alloc-seg" style="width: {(val / allocTotal) * 100}%; background: {classColor(cls)}" title="{cls}: {money(val)}"></span>
		{/each}
	</div>
	<div class="alloc-legend">
		{#each allocation as [cls, val] (cls)}
			<span class="leg"><span class="dot" style="background: {classColor(cls)}"></span>{cls} · {money(val)}</span>
		{/each}
	</div>

	<div class="table-scroll">
		<table class="fin-table">
			<thead>
				<tr>
					<th>{t.security}</th><th class="r">{t.units_col}</th><th class="r">{t.price}</th>
					<th class="r">{t.market_value}</th><th class="r">{t.inv_div_abbr}</th><th class="r">{t.inv_pl_abbr}</th>
					<th class="r">XIRR</th><th class="r">TWR</th><th class="hide-sm"></th>
				</tr>
			</thead>
			<tbody>
				{#each inv.holdings as h (h.commodity)}
					<tr class="hrow" onclick={() => open(h.commodity)} title={t.details_view}>
						<td>
							<span class="ticker">{h.commodity}</span>
							<span class="cname">{h.name}</span>
						</td>
						<td class="r num" data-label={t.units_col}>{fmtUnits(h.units)}</td>
						<td class="r num" data-label={t.price}>{h.price ?? '–'} {h.quote_currency}</td>
						<td class="r num" data-label={t.market_value}>{money(h.market_chf)}</td>
						<td class="r num" data-label={t.inv_div_abbr}>{h.dividends_chf ? money(h.dividends_chf) : '–'}</td>
						<td class="r num {gainClass(gainOf(h))}" data-label={t.inv_pl_abbr}>
							{money(h.gain_chf)}<br /><small>{percent(h.gain_pct)}</small>
						</td>
						<td class="r num {gainClass(h.xirr_pct)}" data-label="XIRR">{percent(h.xirr_pct)}</td>
						<td class="r num {gainClass(h.twr_pct)}" data-label="TWR">{percent(h.twr_pct)}</td>
						<td class="chev hide-sm">›</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr>
					<td>{t.total}</td>
					<td class="hide-sm"></td><td class="hide-sm"></td>
					<td class="r num" data-label={t.market_value}>{money(tot.market_chf)}</td>
					<td class="r num" data-label={t.inv_div_abbr}>{money(tot.dividends_chf)}</td>
					<td class="r num {gainClass(tot.gain_chf)}" data-label={t.inv_pl_abbr}>{money(tot.gain_chf)}<br /><small>{percent(tot.gain_pct)}</small></td>
					<td class="r num {gainClass(tot.xirr_pct)}" data-label="XIRR">{percent(tot.xirr_pct)}</td>
					<td class="r num {gainClass(tot.twr_pct)}" data-label="TWR">{percent(tot.twr_pct)}</td>
					<td class="hide-sm"></td>
				</tr>
			</tfoot>
		</table>
	</div>
	<p class="foot-note">
		<strong>XIRR</strong>{t.inv_foot_xirr}<strong>TWR</strong>{t.inv_foot_twr}{t.inv_foot_tail}
	</p>
</section>

<style>
	.kpis {
		display: flex;
		flex-wrap: wrap;
		gap: 2rem;
		align-items: baseline;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		box-shadow: var(--shadow-sm);
		margin-bottom: 2rem;
	}
	.kpi {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.label {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.figure {
		font-size: var(--text-xl);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
	}
	.kpi.big .figure {
		font-size: var(--text-3xl);
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.25rem 1.5rem;
		box-shadow: var(--shadow-sm);
		margin-bottom: 2rem;
	}
	h2 {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin: 0 0 1rem;
		font-size: var(--text-lg);
		color: var(--color-text-primary);
	}
	.figure.trend {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.hint {
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--color-text-tertiary);
	}
	.hrow {
		cursor: pointer;
		transition: background var(--transition-fast);
	}
	.hrow:hover {
		background: var(--color-bg-elevated);
	}
	.chev {
		color: var(--color-text-tertiary);
		text-align: right;
	}
	.foot-note {
		margin: 1rem 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.pos {
		color: var(--green);
	}
	.neg {
		color: var(--red);
	}
	.flat {
		color: var(--color-text-primary);
	}

	.alloc-bar {
		display: flex;
		height: 0.9rem;
		border-radius: var(--radius-pill);
		overflow: hidden;
		margin-bottom: 0.5rem;
	}
	.alloc-seg {
		display: block;
		height: 100%;
	}
	.alloc-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-bottom: 1.25rem;
	}
	.leg {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		text-transform: capitalize;
	}
	.dot {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
	}

	.table-scroll {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th,
	td {
		padding: 0.45rem 0.5rem;
		text-align: left;
		border-bottom: 1px solid color-mix(in srgb, var(--color-border) 45%, transparent);
	}
	th {
		color: var(--color-text-secondary);
		font-weight: 600;
		white-space: nowrap;
	}
	tfoot td {
		border-top: 2px solid var(--color-border);
		border-bottom: none;
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.r {
		text-align: right;
	}
	.num {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.ticker {
		font-weight: 600;
		color: var(--color-text-primary);
		display: block;
	}
	.cname {
		color: var(--color-text-tertiary);
		font-size: 0.8em;
	}

	@media (max-width: 700px) {
		.kpi.big .figure {
			font-size: var(--text-2xl);
		}
	}
</style>
