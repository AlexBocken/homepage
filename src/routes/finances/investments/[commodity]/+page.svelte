<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import FitnessChart from '$lib/components/fitness/FitnessChart.svelte';
	import { createAxisWidthGroup } from '$lib/stores/axisWidthGroup.svelte';
	import { money, amount, percent, units as fmtUnits, gainClass } from '$lib/utils/finance';
	import type { HoldingDetail } from '$lib/utils/finance';
	import type { PageData } from './$types';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m as financesM, financesLang } from '$lib/js/financesI18n';

	let { data }: { data: PageData } = $props();
	const d: HoldingDetail = $derived(data.detail);
	const t = $derived(financesM[financesLang(languageStore.value)]);
	const c = $derived(d.current);
	const tl = $derived(d.timeline);

	// FitnessChart builds its canvas once; remount (via {#key}) when the range
	// (URL) changes so the charts adopt the new data.
	const chartKey = $derived(page.url.search);

	// All three charts share one date axis + one y-axis width group so they line
	// up, and a synced cursor: hovering one shows the day's chip + a vertical
	// slicer on every graph. The hovered chart keeps its native hover
	// (hoverIndex undefined); the others are driven to the same index.
	const yGroup = createAxisWidthGroup();
	let hover = $state<{ key: string; index: number } | null>(null);
	const onHover = (key: string) => (i: number | null) =>
		(hover = i == null ? null : { key, index: i });
	const hoverAt = (key: string): number | null | undefined =>
		hover == null ? null : hover.key === key ? undefined : hover.index;

	const hasBenchmark = $derived(tl.benchmarks.length > 0);

	const perfData = $derived({
		dates: tl.dates,
		datasets: [
			{
				label: d.commodity,
				data: tl.own,
				borderColor: '#88C0D0',
				backgroundColor: 'transparent',
				borderWidth: 2.5,
				pointRadius: 0,
				tension: 0.1,
				fill: false
			},
			...tl.benchmarks.map((b) => ({
				label: b.commodity,
				data: b.pct,
				borderColor: '#4C566A',
				backgroundColor: 'transparent',
				borderWidth: 2,
				borderDash: [6, 4],
				pointRadius: 0,
				tension: 0.1,
				fill: false
			}))
		]
	});

	const priceData = $derived({
		dates: tl.dates,
		datasets: [
			{
				label: `${t.price} (${d.quote_currency})`,
				data: tl.price,
				borderColor: '#5E81AC',
				backgroundColor: 'rgba(94, 129, 172, 0.12)',
				borderWidth: 2,
				pointRadius: 0,
				tension: 0.15,
				fill: true
			}
		]
	});

	const valueData = $derived({
		dates: tl.dates,
		datasets: [
			{
				label: t.market_value,
				data: tl.market,
				borderColor: '#88C0D0',
				backgroundColor: 'rgba(136, 192, 208, 0.15)',
				borderWidth: 2,
				pointRadius: 0,
				tension: 0.2,
				fill: true
			},
			{
				label: t.cost_basis,
				data: tl.cost,
				borderColor: '#B48EAD',
				backgroundColor: 'transparent',
				borderWidth: 2,
				pointRadius: 0,
				borderDash: [5, 4],
				tension: 0.2,
				fill: false
			}
		]
	});
</script>

<svelte:head><title>{d.commodity} — {t.title_investments}</title></svelte:head>

<a class="back" href={resolve('/finances/investments')}>{t.id_back}</a>

<header class="head">
	<div>
		<h1>{d.commodity}</h1>
		<p class="sub">{d.name}</p>
		<p class="meta">
			{#if d.asset_class}<span class="tag">{d.asset_class}</span>{/if}
			{#if d.isin}<span class="isin">ISIN {d.isin}</span>{/if}
			<span class="isin">{t.id_price_in} {d.quote_currency}</span>
		</p>
	</div>
	<div class="head-gain {gainClass(c.gain_chf)}">
		<span class="hg-val">{money(c.gain_chf)}</span>
		<span class="hg-pct">{percent(c.gain_pct)}</span>
	</div>
</header>

<!-- KPIs -->
<section class="kpis">
	<div class="kpi"><span class="label">{t.market_value}</span><span class="figure">{money(c.market_chf)}</span></div>
	<div class="kpi"><span class="label">{t.cost_basis}</span><span class="figure">{money(c.cost_chf)}</span></div>
	<div class="kpi">
		<span class="label" title={t.id_xirr_tip}>XIRR p.a.</span>
		<span class="figure {gainClass(c.xirr_pct)}">{percent(c.xirr_pct)}</span>
	</div>
	<div class="kpi">
		<span class="label" title={t.id_twr_tip}>TWR p.a.</span>
		<span class="figure {gainClass(c.twr_pct)}">{percent(c.twr_pct)}</span>
	</div>
	<div class="kpi"><span class="label">{t.id_dividends_net}</span><span class="figure">{money(c.dividends_chf)}</span></div>
	<div class="kpi"><span class="label">{t.id_portfolio_share}</span><span class="figure">{d.portfolio_share}%</span></div>
	<div class="kpi"><span class="label">{t.units_col}</span><span class="figure">{fmtUnits(c.units)}</span></div>
	<div class="kpi"><span class="label">{t.price}</span><span class="figure">{c.price ?? '–'} {d.quote_currency}</span></div>
</section>

<!-- Price history -->
<section class="card">
	<h2>{t.id_price_history}</h2>
	{#key chartKey}
		<FitnessChart type="line" height="240px" data={priceData} yWidthGroup={yGroup} onHover={onHover('price')} hoverIndex={hoverAt('price')} tooltipFormatter={(v: number) => amount(v, d.quote_currency)} />
	{/key}
</section>

<!-- Performance vs benchmark -->
{#if hasBenchmark}
	<section class="card">
		<h2>{t.id_return_vs_benchmark} <span class="hint">{t.id_rebased_dashed}</span></h2>
		{#key chartKey}
			<FitnessChart type="line" height="240px" data={perfData} yWidthGroup={yGroup} onHover={onHover('perf')} hoverIndex={hoverAt('perf')} tooltipFormatter={(v: number) => `${v.toFixed(1)} %`} />
		{/key}
	</section>
{/if}

<!-- Value vs cost -->
<section class="card">
	<h2>{t.id_value_dev} <span class="hint">{t.id_value_hint}</span></h2>
	{#key chartKey}
		<FitnessChart type="line" height="240px" data={valueData} yWidthGroup={yGroup} onHover={onHover('value')} hoverIndex={hoverAt('value')} tooltipFormatter={(v: number) => money(v, true)} />
	{/key}
</section>

<!-- Dividends -->
{#if d.dividends.length}
	<section class="card">
		<h2>{t.dividends} <span class="hint">{t.id_div_hint}</span></h2>
		<div class="table-scroll">
			<table>
				<thead>
					<tr><th>{t.date_col}</th><th class="r">{t.id_gross}</th><th class="r">{t.id_withholding}</th><th class="r">{t.net}</th></tr>
				</thead>
				<tbody>
					{#each d.dividends as dv, i (i)}
						<tr>
							<td class="date">{dv.date}</td>
							<td class="r num">{money(dv.gross, true)}</td>
							<td class="r num">{dv.withholding ? `−${money(dv.withholding, true)}` : '–'}</td>
							<td class="r num">{money(dv.net, true)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}

<!-- Transactions -->
<section class="card">
	<h2>{t.id_purchases}</h2>
	{#if d.transactions.length}
		<div class="table-scroll">
			<table>
				<thead>
					<tr><th>{t.date_col}</th><th>{t.account_col}</th><th class="r">{t.units_col}</th><th class="r">{t.price}</th><th>{t.narration_col}</th></tr>
				</thead>
				<tbody>
					{#each d.transactions as tx, i (i)}
						<tr>
							<td class="date">{tx.date}</td>
							<td class="acct">{tx.account.split(':').slice(-2).join(':')}</td>
							<td class="r num">{fmtUnits(tx.units)}</td>
							<td class="r num">{tx.price} {tx.cost_currency}</td>
							<td class="narr">{tx.narration ?? ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="muted">{t.id_no_purchases}</p>
	{/if}
</section>

<style>
	.back {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--color-primary);
		text-decoration: none;
		font-size: var(--text-sm);
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	h1 {
		margin: 0;
		font-size: var(--text-2xl);
		color: var(--color-text-primary);
	}
	.sub {
		margin: 0.1rem 0 0.4rem;
		color: var(--color-text-secondary);
	}
	.meta {
		margin: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.6rem;
		align-items: center;
	}
	.tag {
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-pill);
		padding: 0.15rem 0.6rem;
		font-size: var(--text-sm);
		text-transform: capitalize;
		color: var(--color-text-secondary);
	}
	.isin {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}
	.head-gain {
		text-align: right;
		display: flex;
		flex-direction: column;
	}
	.hg-val {
		font-size: var(--text-2xl);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.hg-pct {
		font-size: var(--text-base);
		font-variant-numeric: tabular-nums;
	}

	.kpis {
		display: flex;
		flex-wrap: wrap;
		gap: 1.5rem 2rem;
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
		font-size: var(--text-lg);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
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
		margin: 0 0 1rem;
		font-size: var(--text-lg);
		color: var(--color-text-primary);
	}
	.hint {
		font-size: var(--text-sm);
		font-weight: 400;
		color: var(--color-text-tertiary);
	}
	.muted {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm);
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
	.r {
		text-align: right;
	}
	.num {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.date {
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.acct {
		color: var(--color-text-secondary);
	}
	.narr {
		color: var(--color-text-secondary);
	}
</style>
