<script lang="ts">
	import { onMount } from 'svelte';
	import { money } from '$lib/utils/finance';
	import type { AccountChild, BalancePoint } from '$lib/utils/finance';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m, financesLang, monthLabel } from '$lib/js/financesI18n';

	const lang = $derived(financesLang(languageStore.value));

	let {
		mode = 'changes',
		months,
		children,
		balanceSeries,
		height = '320px',
		onSelect = undefined
	}: {
		mode?: 'changes' | 'balance';
		months: string[];
		children: AccountChild[];
		balanceSeries: BalancePoint[];
		height?: string;
		onSelect?: ((account: string) => void) | undefined;
	} = $props();

	// Nord-anchored categorical palette (aurora + variants), no blue.
	const PALETTE = [
		'#d08770', '#a3be8c', '#ebcb8b', '#b48ead', '#bf616a', '#8fbcbb',
		'#b76b54', '#86a56e', '#d9b266', '#997491', '#a34e56', '#6fa2a1'
	];

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);
	// Chart.js is dynamically imported, so these are loosely typed.
	let chart: any = null;
	let ChartCtor: any = null;
	let themeTick = $state(0);

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

		const isBalance = mode === 'balance';
		const cfg = isBalance
			? {
					type: 'line',
					data: {
						labels: balanceSeries.map((p) => monthLabel(p.date.slice(0, 7), lang)),
						datasets: [
							{
								label: m[lang].ac_balance,
								data: balanceSeries.map((p) => p.balance),
								borderColor: '#5E81AC',
								backgroundColor: 'rgba(94,129,172,0.15)',
								borderWidth: 2,
								pointRadius: 0,
								tension: 0.2,
								fill: true
							}
						]
					}
				}
			: {
					type: 'bar',
					data: {
						labels: months.map((mk) => monthLabel(mk, lang)),
						datasets: children.map((c, i) => ({
							label: c.name,
							account: c.account,
							data: c.monthly,
							backgroundColor: PALETTE[i % PALETTE.length],
							stack: 'acc',
							borderWidth: 0
						}))
					}
				};

		chart = new ChartCtor(canvas, {
			...cfg,
			options: {
				responsive: true,
				maintainAspectRatio: false,
				animation: { duration: 250 },
				interaction: { mode: 'nearest', intersect: true },
				onClick: (_e: unknown, els: Array<{ datasetIndex: number }>) => {
					if (isBalance || !onSelect || !els.length) return;
					const ds = cfg.data.datasets[els[0].datasetIndex] as { account?: string };
					if (ds?.account) onSelect(ds.account);
				},
				onHover: (e: { native?: { target?: HTMLElement } }, els: unknown[]) => {
					const el = e.native?.target;
					if (el) el.style.cursor = !isBalance && els.length && onSelect ? 'pointer' : 'default';
				},
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (ctx: any) =>
								`${ctx.dataset.label}: ${money(ctx.parsed.y ?? 0, true)}`
						}
					}
				},
				scales: {
					x: { stacked: !isBalance, ticks: { color: text }, grid: { display: false }, border: { color: grid } },
					y: {
						stacked: !isBalance,
						ticks: { color: text, callback: (v: number) => money(Number(v)) },
						grid: { color: (c: { tick: { value: number } }) => (c.tick.value === 0 ? zero : grid) },
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

	$effect(() => {
		void mode;
		void children;
		void balanceSeries;
		void themeTick;
		void lang;
		if (ChartCtor) build();
	});
</script>

<div class="ac" style="height: {height}"><canvas bind:this={canvas}></canvas></div>

<style>
	.ac {
		position: relative;
		width: 100%;
	}
</style>
