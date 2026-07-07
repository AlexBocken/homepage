<script lang="ts">
	import { onMount } from 'svelte';
	import { money } from '$lib/utils/finance';
	import type { Cashflow } from '$lib/utils/finance';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang, monthLabel as monthLabelI18n } from '$lib/js/financesI18n';

	const lang = $derived(financesLang(languageStore.value));
	const t = $derived(m[lang]);

	let {
		data,
		height = '360px',
		/** 'split' = stacked by category; 'total' = one net bar per month (+/-). */
		mode = 'split',
		/** Called with the clicked segment's account, to filter down to it. */
		onSelect = undefined
	}: {
		data: Cashflow;
		height?: string;
		mode?: 'split' | 'total';
		onSelect?: ((account: string) => void) | undefined;
	} = $props();

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	// Chart.js types aren't imported (dynamic import), so these are loosely typed.
	let chart: any = null;
	let ChartCtor: any = null;
	let themeTick = $state(0);

	// Income: one hue (Nord frost / accent blue), a dark→light gradient so the
	// dominant category (salary) is the strongest shade and the rest are tints.
	const incomeColor = (i: number, n: number) => {
		const t = n <= 1 ? 0 : i / (n - 1);
		return `hsl(206, 42%, ${Math.round(48 + t * 24)}%)`;
	};

	// Expenses: Nord Aurora + Frost anchors (no blue — that's income's hue), then
	// darker and lighter Nord-derived variants so ~13 categories stay distinct
	// without leaving the palette's world.
	const EXPENSE_PALETTE = [
		'#bf616a', '#a3be8c', '#ebcb8b', '#b48ead', '#d08770', '#8fbcbb', // aurora + teal
		'#a34e56', '#86a56e', '#d9b266', '#997491', '#b76b54', '#6fa2a1', // darker
		'#d08a91', '#bbcea8', '#f1d9a3', '#c9aac3', '#e0a48d' // lighter
	];

	function isDark() {
		const t = document.documentElement.getAttribute('data-theme');
		if (t === 'dark') return true;
		if (t === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	function build() {
		if (!ChartCtor || !canvas) return;
		if (chart) chart.destroy();

		const dark = isDark();
		const text = dark ? '#D8DEE9' : '#2E3440';
		const grid = dark ? 'rgba(216,222,233,0.10)' : 'rgba(46,52,64,0.10)';
		const zero = dark ? 'rgba(216,222,233,0.35)' : 'rgba(46,52,64,0.35)';

		const green = '#A3BE8C';
		const red = '#BF616A';

		// 'total': one net bar per month, coloured by sign. 'split': income stacks
		// above zero (positive), expenses below (negated), one shared stack so
		// Chart.js splits positives up / negatives down.
		const datasets =
			mode === 'total'
				? [
						{
							label: t.net,
							account: '',
							kind: t.net,
							data: data.net,
							backgroundColor: data.net.map((v) => ((v ?? 0) >= 0 ? green : red)),
							borderWidth: 0
						}
					]
				: [
						...data.income.map((r, i) => ({
							label: r.name,
							account: r.account,
							kind: t.cf_income_one,
							data: r.monthly,
							backgroundColor: incomeColor(i, data.income.length),
							stack: 'cf',
							borderWidth: 0
						})),
						...data.expenses.map((r, i) => ({
							label: r.name,
							account: r.account,
							kind: t.cf_expense_one,
							data: r.monthly.map((v) => (v == null ? null : -v)),
							backgroundColor: EXPENSE_PALETTE[i % EXPENSE_PALETTE.length],
							stack: 'cf',
							borderWidth: 0
						}))
					];

		chart = new ChartCtor(canvas, {
			type: 'bar',
			data: { labels: data.months.map((mk) => monthLabelI18n(mk, lang)), datasets },
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: { duration: 250 },
				interaction: { mode: 'nearest', intersect: true },
				onClick: (_e: unknown, els: Array<{ datasetIndex: number }>) => {
					if (!onSelect || !els.length) return;
					const ds = datasets[els[0].datasetIndex];
					if (ds?.account) onSelect(ds.account);
				},
				onHover: (e: { native?: { target?: HTMLElement } }, els: unknown[]) => {
					const t = e.native?.target;
					if (t) t.style.cursor = els.length && onSelect ? 'pointer' : 'default';
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx: any) => {
								if (mode === 'total') return `${t.net}: ${money(ctx.parsed.y ?? 0, true)}`;
								const val = Math.abs(ctx.parsed.y ?? 0);
								return `${ctx.dataset.kind} · ${ctx.dataset.label}: ${money(val, true)}`;
							}
						}
					}
				},
				scales: {
					x: { stacked: true, ticks: { color: text }, grid: { display: false }, border: { color: grid } },
					y: {
						stacked: true,
						ticks: { color: text, callback: (v: number) => money(Number(v)) },
						grid: {
							color: (c: { tick: { value: number } }) => (c.tick.value === 0 ? zero : grid)
						},
						border: { color: grid }
					}
				}
			}
		});
	}

	onMount(() => {
		let disposed = false;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const onTheme = () => (themeTick += 1);
		mq.addEventListener('change', onTheme);
		const obs = new MutationObserver((muts) => {
			for (const m of muts) if (m.attributeName === 'data-theme') onTheme();
		});
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

		(async () => {
			const mod = await import('chart.js');
			if (disposed) return;
			mod.Chart.register(...mod.registerables);
			ChartCtor = mod.Chart;
			build();
		})();

		return () => {
			disposed = true;
			mq.removeEventListener('change', onTheme);
			obs.disconnect();
			if (chart) chart.destroy();
		};
	});

	// Rebuild when the data or theme changes (Chart.js can't reactively adopt a
	// new dataset list otherwise).
	$effect(() => {
		void data;
		void mode;
		void themeTick;
		void lang;
		if (ChartCtor) build();
	});
</script>

<div class="cf" style="height: {height}">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.cf {
		position: relative;
		width: 100%;
	}
</style>
