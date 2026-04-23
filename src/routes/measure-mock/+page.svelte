<script>
	import Minus from '@lucide/svelte/icons/minus';
	import Plus from '@lucide/svelte/icons/plus';
	import X from '@lucide/svelte/icons/x';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Ruler from '@lucide/svelte/icons/ruler';
	import CopyPlus from '@lucide/svelte/icons/copy-plus';
	import TrendingUp from '@lucide/svelte/icons/trending-up';
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	/** @typedef {{ key: string, label: string, img: string | null, paired: boolean, tip: string }} Step */

	/** @type {Step[]} */
	const steps = [
		{ key: 'neck',      label: 'Neck',      img: 'neck.png',      paired: false, tip: 'Just below the Adam\u2019s apple, tape parallel to the floor.' },
		{ key: 'shoulders', label: 'Shoulders', img: 'shoulders.png', paired: false, tip: 'Widest point across the deltoids, arms relaxed at your sides.' },
		{ key: 'chest',     label: 'Chest',     img: null,            paired: false, tip: 'At nipple line after a normal exhale, tape horizontal.' },
		{ key: 'biceps',    label: 'Biceps',    img: 'bicep.png',     paired: true,  tip: 'Arm flexed at the peak; tape around the thickest part.' },
		{ key: 'forearms',  label: 'Forearms',  img: null,            paired: true,  tip: 'Widest point below the elbow, arm hanging relaxed.' },
		{ key: 'waist',     label: 'Waist',     img: 'waist.png',     paired: false, tip: 'At the navel, relaxed — don\u2019t suck in.' },
		{ key: 'hips',      label: 'Hips',      img: null,            paired: false, tip: 'Around the widest point of the buttocks.' },
		{ key: 'thighs',    label: 'Thighs',    img: 'thigh.png',     paired: true,  tip: 'Midway between hip crease and knee.' },
		{ key: 'calves',    label: 'Calves',    img: 'calves.png',    paired: true,  tip: 'Widest point, standing with weight on both feet.' }
	];

	// Seeded fake history to demonstrate the graph. In production this comes from the measurements API.
	const dates = ['2025-08-12', '2025-09-20', '2025-10-18', '2025-11-14', '2025-12-22', '2026-02-05', '2026-03-17'];
	/** @type {Record<string, any[]>} */
	const history = {
		neck:      dates.slice(2).map((d, i) => ({ date: d, value: 38.6 + i * 0.15 + (i % 2 ? 0.08 : -0.1) })),
		shoulders: dates.map((d, i) => ({ date: d, value: 117.4 + i * 0.4 })),
		chest:     [],
		biceps:    dates.slice(1).map((d, i) => ({ date: d, left: 33.2 + i * 0.25, right: 33.0 + i * 0.22 })),
		forearms:  dates.slice(3).map((d, i) => ({ date: d, left: 27.8 + i * 0.1, right: 27.6 + i * 0.12 })),
		waist:     dates.map((d, i) => ({ date: d, value: 83.2 - i * 0.4 + (i % 2 ? 0.1 : -0.2) })),
		hips:      dates.slice(1).map((d, i) => ({ date: d, value: 96.2 + (i % 2 ? 0.25 : -0.15) })),
		thighs:    dates.slice(2).map((d, i) => ({ date: d, left: 55.5 + i * 0.2, right: 55.7 + i * 0.2 })),
		calves:    []
	};

	/** @type {Record<string, any>} */
	const initial = {};
	for (const s of steps) {
		initial[s.key] = s.paired ? { left: '', right: '', same: true } : '';
	}
	let values = $state(initial);

	let idx = $state(0);
	let direction = $state(1);

	const total = steps.length;
	const step = $derived(steps[idx] ?? steps[0]);
	const done = $derived(idx >= total);

	/** @param {string} key @param {'left'|'right'|null} side @param {number} delta */
	function bump(key, side, delta) {
		if (side) {
			const cur = Number(values[key][side]) || 0;
			values[key][side] = String(Math.round((cur + delta) * 10) / 10);
		} else {
			const cur = Number(values[key]) || 0;
			values[key] = String(Math.round((cur + delta) * 10) / 10);
		}
	}

	/** @param {WheelEvent} e @param {string} key @param {'left'|'right'|null} side */
	function onWheel(e, key, side) {
		if (!e.deltaY) return;
		e.preventDefault();
		bump(key, side, e.deltaY < 0 ? 0.1 : -0.1);
	}

	function next() { direction = 1; if (idx < total) idx += 1; }
	function back() { direction = -1; if (idx > 0) idx -= 1; }
	function skip() {
		const s = steps[idx];
		values[s.key] = s.paired ? { left: '', right: '', same: true } : '';
		next();
	}
	/** @param {string} key */
	function copyLtoR(key) { values[key].right = values[key].left; }
	/** @param {number} i */
	function jumpTo(i) {
		direction = i > idx ? 1 : -1;
		idx = i;
	}

	/** @param {Step} s */
	function isFilled(s) {
		const v = values[s.key];
		if (s.paired) return !!(v.left || v.right);
		return !!v;
	}
	/** @param {Step} s */
	function formatValue(s) {
		const v = values[s.key];
		if (s.paired) {
			if (v.same) return v.left ? `${v.left} cm` : '—';
			if (v.left && v.right) return `L ${v.left} · R ${v.right}`;
			if (v.left) return `L ${v.left}`;
			if (v.right) return `R ${v.right}`;
			return '—';
		}
		return v ? `${v} cm` : '—';
	}

	/** @param {KeyboardEvent} e */
	function onkey(e) {
		if (done) {
			if (e.key === 'ArrowLeft') { e.preventDefault(); idx = total - 1; direction = -1; }
			return;
		}
		// Ignore when typing in an input except for arrow up/down to nudge
		const tag = /** @type {HTMLElement|null} */ (e.target)?.tagName;
		const inInput = tag === 'INPUT';
		if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); next(); }
		else if (e.key === 'ArrowRight' && !inInput) { e.preventDefault(); next(); }
		else if (e.key === 'ArrowLeft' && !inInput) { e.preventDefault(); back(); }
		else if ((e.key === 's' || e.key === 'S') && !inInput) { e.preventDefault(); skip(); }
	}

	const flyOpts = $derived({ x: direction * 40, duration: 260, easing: cubicOut });

	// ----- Chart -----

	const CHART_W = 340;
	const CHART_H = 120;
	const CHART_PAD = { t: 12, r: 14, b: 20, l: 10 };

	/** @param {Step} s */
	function chartSeries(s) {
		const h = history[s.key] ?? [];
		const v = values[s.key];
		/** @type {Array<{name: string, color: string, points: {date: string, value: number}[], pending: number | null}>} */
		const series = [];
		if (s.paired) {
			const leftPoints = h.map((r) => ({ date: r.date, value: r.left }));
			const rightPoints = h.map((r) => ({ date: r.date, value: r.right }));
			const pendL = Number(v.left);
			const pendR = v.same ? Number(v.left) : Number(v.right);
			series.push({ name: 'L', color: 'var(--color-primary)', points: leftPoints, pending: isFinite(pendL) && v.left !== '' ? pendL : null });
			series.push({ name: 'R', color: 'var(--orange)', points: rightPoints, pending: isFinite(pendR) && (v.same ? v.left : v.right) !== '' ? pendR : null });
		} else {
			const p = h.map((r) => ({ date: r.date, value: r.value }));
			const pend = Number(v);
			series.push({ name: '', color: 'var(--color-primary)', points: p, pending: isFinite(pend) && v !== '' ? pend : null });
		}
		return series;
	}

	const chart = $derived.by(() => {
		const series = chartSeries(step);
		const hasHistory = series.some((s) => s.points.length > 0);
		const hasPending = series.some((s) => s.pending != null);
		if (!hasHistory && !hasPending) {
			return { empty: true, series: [], axis: null };
		}

		const allValues = series.flatMap((s) => [
			...s.points.map((p) => p.value),
			...(s.pending != null ? [s.pending] : [])
		]).filter((n) => isFinite(n));
		const min = Math.min(...allValues);
		const max = Math.max(...allValues);
		const span = max - min;
		const pad = span === 0 ? Math.max(0.5, max * 0.02) : span * 0.25;
		const yMin = min - pad;
		const yMax = max + pad;

		const pointCount = series[0].points.length + (hasPending ? 1 : 0);
		const innerW = CHART_W - CHART_PAD.l - CHART_PAD.r;
		const innerH = CHART_H - CHART_PAD.t - CHART_PAD.b;

		/** @param {number} i @param {number} total */
		const xAt = (i, total) =>
			CHART_PAD.l + (total <= 1 ? innerW / 2 : (i / (total - 1)) * innerW);
		/** @param {number} v */
		const yAt = (v) =>
			CHART_PAD.t + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

		const rendered = series.map((s) => {
			const hist = s.points.map((p, i) => ({ x: xAt(i, pointCount), y: yAt(p.value), value: p.value, date: p.date }));
			const pending =
				s.pending != null
					? { x: xAt(s.points.length, pointCount), y: yAt(s.pending), value: s.pending }
					: null;
			const all = [...hist, ...(pending ? [pending] : [])];
			const linePath = all.length > 0 ? 'M' + all.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ') : '';
			const baseY = CHART_PAD.t + innerH;
			const areaPath = all.length > 0
				? `M ${all[0].x.toFixed(1)},${baseY.toFixed(1)} L ` +
				  all.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ') +
				  ` L ${all[all.length - 1].x.toFixed(1)},${baseY.toFixed(1)} Z`
				: '';
			return { name: s.name, color: s.color, linePath, areaPath, hist, pending };
		});

		return {
			empty: false,
			series: rendered,
			axis: { yMin: yMin.toFixed(1), yMax: yMax.toFixed(1), lastDate: series[0].points.at(-1)?.date ?? null }
		};
	});

	/** @param {string | null | undefined} d */
	function shortDate(d) {
		if (!d) return '';
		const dt = new Date(d);
		return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
</script>

<svelte:window onkeydown={onkey} />
<svelte:head><title>Measure (mockup)</title></svelte:head>

<div class="shell" class:is-done={done}>
	<!-- Step rail (desktop) -->
	<aside class="rail" aria-label="Steps">
		<div class="rail-header">
			<span class="rail-eyebrow">Measurements</span>
			<span class="rail-count">{steps.filter(isFilled).length}/{total}</span>
		</div>
		<ol class="rail-list">
			{#each steps as s, i (s.key)}
				{@const filled = isFilled(s)}
				<li>
					<button
						type="button"
						class="rail-item"
						class:active={i === idx && !done}
						class:filled
						onclick={() => jumpTo(i)}
					>
						<span class="rail-dot" aria-hidden="true">
							{#if filled}<Check size={11} strokeWidth={3} />{/if}
						</span>
						<span class="rail-label">{s.label}</span>
						<span class="rail-value">{formatValue(s)}</span>
					</button>
				</li>
			{/each}
			<li>
				<button
					type="button"
					class="rail-item review"
					class:active={done}
					onclick={() => { direction = 1; idx = total; }}
				>
					<span class="rail-dot" aria-hidden="true"><Check size={11} strokeWidth={3} /></span>
					<span class="rail-label">Review &amp; save</span>
					<span class="rail-value"></span>
				</button>
			</li>
		</ol>
	</aside>

	<!-- Topbar (mobile progress + exit) -->
	<header class="topbar">
		<div class="progress" aria-label="Progress">
			{#each steps as s, i (s.key)}
				<span class="dot" class:active={i === idx && !done} class:past={i < idx || done}></span>
			{/each}
		</div>
		<button class="icon-x" aria-label="Exit">
			<X size={18} />
		</button>
	</header>

	<!-- Main stage -->
	<main class="stage">
		{#if !done}
			{#key step.key}
				<section class="card" in:fly={flyOpts}>
					<div class="hero">
						{#if step.img}
							<img src="/fitness/measure/{step.img}" alt="" class="hero-pic" />
						{:else}
							<div class="hero-placeholder" aria-hidden="true">
								<Ruler size={72} strokeWidth={1.4} />
								<span class="placeholder-label">{step.label}</span>
							</div>
						{/if}
					</div>

					<div class="meta">
						<span class="eyebrow">Step {idx + 1} of {total}</span>
						<h1 class="title">{step.label}</h1>
						<p class="tip">{step.tip}</p>
					</div>

					{#if step.paired}
						{@const pv = values[step.key]}
						{#if pv.same}
							<div class="stepper" onwheel={(e) => onWheel(e, step.key, 'left')}>
								<button type="button" class="step-btn" onclick={() => bump(step.key, 'left', -0.1)} aria-label="-0.1">
									<Minus size={20} />
								</button>
								<div class="num-wrap">
									<input type="number" step="0.1" bind:value={pv.left} placeholder="—" inputmode="decimal" />
									<span class="unit">cm</span>
								</div>
								<button type="button" class="step-btn" onclick={() => bump(step.key, 'left', 0.1)} aria-label="+0.1">
									<Plus size={20} />
								</button>
							</div>
						{:else}
							<div class="split">
								<div class="stepper compact" onwheel={(e) => onWheel(e, step.key, 'left')}>
									<span class="side-tag" style="--side-color: var(--color-primary)">L</span>
									<button type="button" class="step-btn sm" onclick={() => bump(step.key, 'left', -0.1)} aria-label="L -0.1">
										<Minus size={14} />
									</button>
									<input type="number" step="0.1" bind:value={pv.left} placeholder="—" inputmode="decimal" />
									<span class="unit-sm">cm</span>
									<button type="button" class="step-btn sm" onclick={() => bump(step.key, 'left', 0.1)} aria-label="L +0.1">
										<Plus size={14} />
									</button>
								</div>
								<div class="stepper compact" onwheel={(e) => onWheel(e, step.key, 'right')}>
									<span class="side-tag" style="--side-color: var(--orange)">R</span>
									<button type="button" class="step-btn sm" onclick={() => bump(step.key, 'right', -0.1)} aria-label="R -0.1">
										<Minus size={14} />
									</button>
									<input type="number" step="0.1" bind:value={pv.right} placeholder="—" inputmode="decimal" />
									<span class="unit-sm">cm</span>
									<button type="button" class="step-btn sm" onclick={() => bump(step.key, 'right', 0.1)} aria-label="R +0.1">
										<Plus size={14} />
									</button>
								</div>
								<button type="button" class="copy-btn" onclick={() => copyLtoR(step.key)} disabled={!pv.left}>
									<CopyPlus size={13} /> Copy L → R
								</button>
							</div>
						{/if}
						<label class="same-toggle">
							<input type="checkbox" bind:checked={pv.same} />
							<span>Same on both sides</span>
						</label>
					{:else}
						<div class="stepper" onwheel={(e) => onWheel(e, step.key, null)}>
							<button type="button" class="step-btn" onclick={() => bump(step.key, null, -0.1)} aria-label="-0.1">
								<Minus size={20} />
							</button>
							<div class="num-wrap">
								<input type="number" step="0.1" bind:value={values[step.key]} placeholder="—" inputmode="decimal" />
								<span class="unit">cm</span>
							</div>
							<button type="button" class="step-btn" onclick={() => bump(step.key, null, 0.1)} aria-label="+0.1">
								<Plus size={20} />
							</button>
						</div>
					{/if}
				</section>
			{/key}
		{:else}
			<section class="summary" in:fly={{ y: 16, duration: 320, easing: cubicOut }}>
				<div class="check-halo">
					<Check size={42} strokeWidth={2.4} />
				</div>
				<h1 class="title">Ready to save</h1>
				<p class="tip">Review your numbers below.</p>

				<ul class="summary-list">
					{#each steps as s (s.key)}
						<li>
							<span class="sum-label">{s.label}</span>
							<span class="sum-val" class:empty={formatValue(s) === '—'}>{formatValue(s)}</span>
						</li>
					{/each}
				</ul>

				<div class="summary-actions">
					<button class="ghost" onclick={() => { idx = 0; direction = -1; }}>
						<ArrowLeft size={14} /> Edit again
					</button>
					<button class="nav-btn primary">
						<Check size={16} /> Save measurement
					</button>
				</div>
			</section>
		{/if}
	</main>

	<!-- Right panel (desktop) -->
	<aside class="panel" aria-label="History and totals">
		{#if !done}
			{#key step.key}
				<div class="panel-section chart-section" in:fade={{ duration: 180 }}>
					<div class="panel-head">
						<TrendingUp size={14} />
						<h3 class="panel-title">{step.label} over time</h3>
					</div>
					{#if chart.empty}
						<div class="chart-empty">
							<span class="chart-empty-dot"></span>
							First measurement — your entry will appear here.
						</div>
					{:else}
						<svg class="chart" viewBox="0 0 {CHART_W} {CHART_H}" role="img" aria-label="Progress graph">
							<defs>
								<linearGradient id="area-grad-primary" x1="0" x2="0" y1="0" y2="1">
									<stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.25" />
									<stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0" />
								</linearGradient>
								<linearGradient id="area-grad-orange" x1="0" x2="0" y1="0" y2="1">
									<stop offset="0%" stop-color="var(--orange)" stop-opacity="0.18" />
									<stop offset="100%" stop-color="var(--orange)" stop-opacity="0" />
								</linearGradient>
							</defs>
							<!-- baseline -->
							<line x1={CHART_PAD.l} x2={CHART_W - CHART_PAD.r} y1={CHART_H - CHART_PAD.b} y2={CHART_H - CHART_PAD.b} class="axis-line" />
							{#each chart.series as s, i (s.name || 'single')}
								<path d={s.areaPath} fill={i === 0 ? 'url(#area-grad-primary)' : 'url(#area-grad-orange)'} />
								<path d={s.linePath} stroke={s.color} stroke-width="1.8" fill="none" stroke-linejoin="round" stroke-linecap="round" />
								{#each s.hist as d}
									<circle cx={d.x} cy={d.y} r="2.5" fill={s.color} class="hist-dot" />
								{/each}
								{#if s.pending}
									<circle cx={s.pending.x} cy={s.pending.y} r="11" fill={s.color} opacity="0.16" class="pulse" />
									<circle cx={s.pending.x} cy={s.pending.y} r="4.5" fill={s.color} stroke="var(--color-surface)" stroke-width="2" class="pending-dot" />
								{/if}
							{/each}
							<!-- y labels -->
							{#if chart.axis}
								<text x={CHART_W - 2} y={CHART_PAD.t + 4} text-anchor="end" class="axis-label">{chart.axis.yMax}</text>
								<text x={CHART_W - 2} y={CHART_H - CHART_PAD.b - 2} text-anchor="end" class="axis-label">{chart.axis.yMin}</text>
								{#if chart.axis.lastDate}
									<text x={CHART_PAD.l} y={CHART_H - 4} text-anchor="start" class="axis-label">{shortDate(chart.axis.lastDate)}</text>
								{/if}
								<text x={CHART_W - CHART_PAD.r} y={CHART_H - 4} text-anchor="end" class="axis-label accent">Today</text>
							{/if}
						</svg>
						{#if chart.series.length > 1}
							<div class="legend">
								{#each chart.series as s}
									<span class="legend-item">
										<span class="swatch" style:background={s.color}></span>
										<span>{s.name}</span>
										{#if s.pending != null}
											<span class="legend-val">{s.pending.value.toFixed(1)}</span>
										{/if}
									</span>
								{/each}
							</div>
						{:else if chart.series[0]?.pending != null}
							<div class="legend single">
								<span class="legend-item">
									<span class="swatch" style:background={chart.series[0].color}></span>
									<span class="legend-val">{chart.series[0].pending.value.toFixed(1)} cm</span>
									<span class="legend-tag">today</span>
								</span>
							</div>
						{/if}
					{/if}
				</div>
			{/key}
		{/if}

		<div class="panel-section totals-section">
			<div class="panel-head">
				<h3 class="panel-title">Running totals</h3>
			</div>
			<ul class="totals">
				{#each steps as s, i (s.key)}
					<li class:dim={!isFilled(s)} class:focused={i === idx && !done}>
						<button type="button" class="totals-item" onclick={() => jumpTo(i)}>
							<span class="totals-label">{s.label}</span>
							<span class="totals-val">{formatValue(s)}</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</aside>

	<!-- Bottom bar -->
	<footer class="bottombar">
		{#if !done}
			<button class="ghost" onclick={skip}>Skip</button>
			<div class="kbd-legend" aria-hidden="true">
				<span><kbd>←</kbd><kbd>→</kbd> nav</span>
				<span><kbd>↵</kbd> next</span>
				<span><kbd>S</kbd> skip</span>
				<span><kbd>scroll</kbd> ±0.1</span>
			</div>
			<div class="nav-pair">
				<button class="nav-btn" onclick={back} disabled={idx === 0} aria-label="Back">
					<ArrowLeft size={16} />
				</button>
				<button class="nav-btn primary" onclick={next}>
					{idx === total - 1 ? 'Review' : 'Next'}
					<ArrowRight size={16} />
				</button>
			</div>
		{:else}
			<span class="bottom-spacer"></span>
		{/if}
	</footer>
</div>

<style>
	.shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background:
			radial-gradient(1200px 600px at 20% -10%, color-mix(in oklab, var(--color-primary) 10%, transparent), transparent 60%),
			radial-gradient(800px 400px at 90% 110%, color-mix(in oklab, var(--color-primary) 8%, transparent), transparent 55%),
			var(--color-bg-primary);
		color: var(--color-text-primary);
	}

	/* ============ Rail (left, desktop only) ============ */
	.rail {
		display: none;
	}

	/* ============ Topbar ============ */
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
	}
	.progress {
		display: flex;
		gap: 0.4rem;
		flex: 1;
		align-items: center;
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 999px;
		background: var(--color-border);
		transition: all 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.dot.past { background: color-mix(in oklab, var(--color-primary) 60%, transparent); }
	.dot.active {
		width: 22px;
		background: var(--color-primary);
	}
	.icon-x {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		cursor: pointer;
		transition: all 150ms;
	}
	.icon-x:hover {
		color: var(--color-text-primary);
		border-color: var(--color-text-tertiary);
	}

	/* ============ Stage ============ */
	.stage {
		flex: 1;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding: 0.5rem 1rem 2rem;
		overflow: hidden;
	}
	.card {
		width: 100%;
		max-width: 440px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.1rem;
	}

	.hero {
		width: 220px;
		height: 220px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background:
			radial-gradient(closest-side, var(--color-surface), transparent 70%),
			var(--color-bg-secondary);
		box-shadow: var(--shadow-md);
		position: relative;
	}
	.hero::after {
		content: '';
		position: absolute;
		inset: -2px;
		border-radius: 50%;
		border: 1px dashed color-mix(in oklab, var(--color-primary) 45%, transparent);
		opacity: 0.6;
		pointer-events: none;
	}
	.hero-pic {
		width: 150px;
		height: 150px;
		object-fit: contain;
	}
	@media (prefers-color-scheme: dark) {
		.hero-pic { filter: invert(1); }
	}
	:global(:root[data-theme="dark"]) .hero-pic { filter: invert(1); }
	:global(:root[data-theme="light"]) .hero-pic { filter: none; }

	.hero-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-text-tertiary);
	}
	.placeholder-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		font-weight: 600;
	}

	.meta {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		text-align: center;
	}
	.eyebrow {
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
	}
	.title {
		margin: 0;
		font-size: 2.4rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1;
	}
	.tip {
		margin: 0;
		max-width: 340px;
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--color-text-secondary);
	}

	.stepper {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.9rem 1rem;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-md);
	}
	.step-btn {
		display: grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: all 150ms;
	}
	.step-btn:hover {
		background: var(--color-bg-elevated);
		border-color: var(--color-primary);
	}
	.step-btn:active {
		transform: scale(0.94);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}
	.step-btn.sm { width: 2.1rem; height: 2.1rem; }
	.num-wrap {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		min-width: 6.5rem;
		justify-content: center;
	}
	.num-wrap input {
		width: 5ch;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-size: 2.6rem;
		font-weight: 700;
		text-align: center;
		letter-spacing: -0.02em;
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.num-wrap input::-webkit-inner-spin-button,
	.num-wrap input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
	.num-wrap input::placeholder { color: var(--color-text-tertiary); }
	.num-wrap input:focus { outline: none; }
	.unit {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.split {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		align-items: stretch;
		width: 100%;
		max-width: 340px;
	}
	.stepper.compact {
		gap: 0.5rem;
		padding: 0.55rem 0.75rem;
		justify-content: space-between;
	}
	.stepper.compact input {
		width: 4ch;
		font-size: 1.4rem;
		border: none;
		background: transparent;
		color: var(--color-text-primary);
		font-weight: 600;
		text-align: center;
	}
	.stepper.compact input:focus { outline: none; }
	.side-tag {
		font-weight: 700;
		font-size: 0.78rem;
		letter-spacing: 0.1em;
		padding: 0.2rem 0.55rem;
		border-radius: var(--radius-pill);
		background: color-mix(in oklab, var(--side-color, var(--color-primary)) 18%, transparent);
		color: var(--side-color, var(--color-text-secondary));
	}
	.unit-sm {
		font-size: 0.72rem;
		font-weight: 600;
		color: var(--color-text-tertiary);
	}
	.copy-btn {
		align-self: center;
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.7rem;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-pill);
		background: transparent;
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
		cursor: pointer;
		transition: all 150ms;
	}
	.copy-btn:hover:not(:disabled) {
		color: var(--color-primary);
		border-color: var(--color-primary);
		border-style: solid;
	}
	.copy-btn:disabled { opacity: 0.45; cursor: not-allowed; }

	.same-toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.78rem;
		color: var(--color-text-secondary);
		cursor: pointer;
		user-select: none;
	}
	.same-toggle input {
		accent-color: var(--color-primary);
		width: 0.95rem;
		height: 0.95rem;
	}

	/* ============ Right panel (hidden on mobile) ============ */
	.panel {
		display: none;
	}

	/* ============ Bottom bar ============ */
	.bottombar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem 1.5rem;
		gap: 0.75rem;
		max-width: 520px;
		width: 100%;
		margin-inline: auto;
	}
	.ghost {
		border: none;
		background: transparent;
		color: var(--color-text-tertiary);
		font-size: 0.85rem;
		padding: 0.5rem 0.75rem;
		cursor: pointer;
		border-radius: var(--radius-md);
		transition: color 150ms;
	}
	.ghost:hover { color: var(--color-text-primary); }
	.nav-pair { display: flex; gap: 0.5rem; }
	.nav-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.7rem 1.15rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		color: var(--color-text-primary);
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 150ms;
	}
	.nav-btn:hover:not(:disabled) { border-color: var(--color-text-tertiary); }
	.nav-btn:disabled { opacity: 0.4; cursor: not-allowed; }
	.nav-btn.primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
		box-shadow: var(--shadow-sm);
	}
	.nav-btn.primary:hover {
		background: var(--color-primary-hover);
		border-color: var(--color-primary-hover);
	}

	.kbd-legend {
		display: none;
	}
	.bottom-spacer { flex: 1; }

	/* ============ Summary ============ */
	.summary {
		flex: 1;
		width: 100%;
		max-width: 480px;
		margin: 2rem auto 3rem;
		padding: 0 1.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}
	.check-halo {
		display: grid;
		place-items: center;
		width: 76px;
		height: 76px;
		border-radius: 50%;
		background: color-mix(in oklab, var(--color-primary) 18%, transparent);
		color: var(--color-primary);
		box-shadow: 0 0 0 8px color-mix(in oklab, var(--color-primary) 8%, transparent);
		margin-bottom: 0.25rem;
	}
	.summary .title { font-size: 1.8rem; }
	.summary .tip { margin-bottom: 0.5rem; }
	.summary-list {
		list-style: none;
		margin: 0;
		padding: 0;
		width: 100%;
		background: var(--color-surface);
		border-radius: var(--radius-card);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}
	.summary-list li {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.summary-list li:last-child { border-bottom: none; }
	.sum-label { font-size: 0.9rem; color: var(--color-text-secondary); }
	.sum-val {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.01em;
	}
	.sum-val.empty { color: var(--color-text-tertiary); font-weight: 400; }
	.summary-actions {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		margin-top: 0.5rem;
	}

	/* ======================== Desktop: 3-column grid ======================== */
	@media (min-width: 1024px) {
		.shell {
			display: grid;
			grid-template-columns: 260px minmax(0, 1fr) 360px;
			grid-template-rows: auto 1fr auto;
			grid-template-areas:
				"rail topbar panel"
				"rail stage  panel"
				"rail bottom panel";
			min-height: 100vh;
		}
		.rail   { grid-area: rail; }
		.topbar { grid-area: topbar; padding: 1.25rem 2rem 0; }
		.stage  { grid-area: stage; padding: 1.5rem 2rem 2rem; align-items: center; }
		.panel  { grid-area: panel; }
		.bottombar { grid-area: bottom; max-width: none; margin-inline: 0; padding: 1rem 2rem 1.5rem; }

		/* Hide mobile progress dots; rail handles it */
		.topbar .progress { visibility: hidden; }

		/* Rail */
		.rail {
			display: flex;
			flex-direction: column;
			border-right: 1px solid var(--color-border);
			padding: 1.5rem 0.75rem 1.5rem 1.5rem;
			background: color-mix(in oklab, var(--color-surface) 55%, transparent);
			backdrop-filter: blur(8px);
			overflow-y: auto;
		}
		.rail-header {
			display: flex;
			align-items: baseline;
			justify-content: space-between;
			margin-bottom: 1rem;
			padding-right: 0.5rem;
		}
		.rail-eyebrow {
			font-size: 0.65rem;
			letter-spacing: 0.18em;
			text-transform: uppercase;
			font-weight: 700;
			color: var(--color-text-tertiary);
		}
		.rail-count {
			font-size: 0.75rem;
			font-variant-numeric: tabular-nums;
			color: var(--color-text-secondary);
			font-weight: 600;
		}
		.rail-list {
			list-style: none;
			margin: 0;
			padding: 0;
			display: flex;
			flex-direction: column;
			gap: 0.1rem;
		}
		.rail-item {
			width: 100%;
			display: grid;
			grid-template-columns: 22px 1fr auto;
			align-items: center;
			gap: 0.6rem;
			padding: 0.55rem 0.75rem;
			border: none;
			background: transparent;
			color: var(--color-text-secondary);
			text-align: left;
			cursor: pointer;
			border-radius: var(--radius-md);
			position: relative;
			transition: all 150ms;
		}
		.rail-item::before {
			content: '';
			position: absolute;
			left: -0.75rem;
			top: 20%;
			bottom: 20%;
			width: 2px;
			background: transparent;
			border-radius: 999px;
			transition: background 150ms;
		}
		.rail-item:hover {
			background: var(--color-bg-elevated);
			color: var(--color-text-primary);
		}
		.rail-item.active {
			background: color-mix(in oklab, var(--color-primary) 10%, transparent);
			color: var(--color-text-primary);
		}
		.rail-item.active::before {
			background: var(--color-primary);
		}
		.rail-dot {
			display: grid;
			place-items: center;
			width: 22px;
			height: 22px;
			border-radius: 999px;
			border: 1.5px solid var(--color-border);
			background: var(--color-bg-primary);
			color: var(--color-text-on-primary);
			transition: all 200ms;
		}
		.rail-item.active .rail-dot {
			border-color: var(--color-primary);
			box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 15%, transparent);
		}
		.rail-item.filled .rail-dot {
			background: var(--color-primary);
			border-color: var(--color-primary);
		}
		.rail-item.review .rail-dot {
			border-style: dashed;
			border-color: var(--color-text-tertiary);
		}
		.rail-item.review.active .rail-dot {
			background: var(--color-primary);
			border-color: var(--color-primary);
		}
		.rail-label {
			font-size: 0.88rem;
			font-weight: 600;
		}
		.rail-value {
			font-size: 0.72rem;
			font-variant-numeric: tabular-nums;
			color: var(--color-text-tertiary);
			letter-spacing: 0.01em;
		}
		.rail-item.filled .rail-value { color: var(--color-text-secondary); }

		/* Panel */
		.panel {
			display: flex;
			flex-direction: column;
			gap: 1rem;
			border-left: 1px solid var(--color-border);
			padding: 1.5rem 1.25rem;
			background: color-mix(in oklab, var(--color-surface) 55%, transparent);
			backdrop-filter: blur(8px);
			overflow-y: auto;
		}
		.panel-section {
			background: var(--color-surface);
			border: 1px solid var(--color-border);
			border-radius: var(--radius-lg);
			padding: 0.9rem 1rem;
		}
		.panel-head {
			display: flex;
			align-items: center;
			gap: 0.4rem;
			margin-bottom: 0.6rem;
			color: var(--color-text-tertiary);
		}
		.panel-title {
			margin: 0;
			font-size: 0.72rem;
			font-weight: 700;
			letter-spacing: 0.12em;
			text-transform: uppercase;
			color: var(--color-text-tertiary);
		}

		/* Chart */
		.chart {
			width: 100%;
			height: auto;
			display: block;
		}
		.chart .axis-line {
			stroke: var(--color-border);
			stroke-width: 1;
			stroke-dasharray: 2 3;
		}
		.chart .axis-label {
			font-size: 8.5px;
			fill: var(--color-text-tertiary);
			font-weight: 600;
			letter-spacing: 0.04em;
		}
		.chart .axis-label.accent {
			fill: var(--color-primary);
		}
		.chart .hist-dot {
			opacity: 0.85;
		}
		.chart .pulse {
			animation: pulse-grow 1.8s ease-out infinite;
			transform-origin: center;
			transform-box: fill-box;
		}
		.chart .pending-dot {
			filter: drop-shadow(0 1px 2px color-mix(in oklab, var(--color-primary) 40%, transparent));
		}

		.chart-empty {
			display: flex;
			align-items: center;
			gap: 0.5rem;
			padding: 1rem 0.25rem;
			color: var(--color-text-tertiary);
			font-size: 0.8rem;
			font-style: italic;
		}
		.chart-empty-dot {
			width: 10px;
			height: 10px;
			border-radius: 50%;
			background: var(--color-primary);
			box-shadow: 0 0 0 3px color-mix(in oklab, var(--color-primary) 25%, transparent);
			flex-shrink: 0;
		}
		.legend {
			display: flex;
			gap: 0.85rem;
			margin-top: 0.35rem;
			flex-wrap: wrap;
		}
		.legend.single { justify-content: flex-end; }
		.legend-item {
			display: inline-flex;
			align-items: center;
			gap: 0.35rem;
			font-size: 0.72rem;
			color: var(--color-text-secondary);
			font-weight: 600;
		}
		.swatch {
			width: 8px;
			height: 8px;
			border-radius: 999px;
			display: inline-block;
		}
		.legend-val {
			font-variant-numeric: tabular-nums;
			color: var(--color-text-primary);
		}
		.legend-tag {
			font-size: 0.6rem;
			text-transform: uppercase;
			letter-spacing: 0.1em;
			color: var(--color-primary);
			font-weight: 700;
		}

		/* Totals */
		.totals {
			list-style: none;
			margin: 0;
			padding: 0;
		}
		.totals li { border-bottom: 1px dashed var(--color-border); }
		.totals li:last-child { border-bottom: none; }
		.totals-item {
			width: 100%;
			display: flex;
			justify-content: space-between;
			align-items: baseline;
			padding: 0.42rem 0.2rem;
			background: transparent;
			border: none;
			color: inherit;
			text-align: left;
			cursor: pointer;
			transition: color 150ms;
		}
		.totals-item:hover { color: var(--color-text-primary); }
		.totals-label {
			font-size: 0.82rem;
			color: var(--color-text-secondary);
		}
		.totals-val {
			font-size: 0.82rem;
			font-weight: 700;
			font-variant-numeric: tabular-nums;
		}
		.totals li.dim .totals-val { color: var(--color-text-tertiary); font-weight: 400; }
		.totals li.focused .totals-label {
			color: var(--color-primary);
			font-weight: 700;
		}

		/* Bigger stage on desktop */
		.hero { width: 300px; height: 300px; }
		.hero-pic { width: 200px; height: 200px; }
		.title { font-size: 3.2rem; }
		.tip { font-size: 1rem; max-width: 420px; }
		.num-wrap input { font-size: 3rem; }

		/* Paired split goes horizontal on desktop */
		.split {
			flex-direction: row;
			align-items: center;
			max-width: none;
			gap: 0.6rem;
			flex-wrap: wrap;
			justify-content: center;
		}
		.split .copy-btn { flex-basis: 100%; order: 3; }
		.stepper.compact { flex: 1 1 180px; min-width: 180px; }

		.kbd-legend {
			display: flex;
			gap: 1rem;
			font-size: 0.68rem;
			color: var(--color-text-tertiary);
			flex: 1;
			justify-content: center;
			align-items: center;
		}
		.kbd-legend span {
			display: inline-flex;
			align-items: center;
			gap: 0.3rem;
		}
		.kbd-legend kbd {
			font-family: inherit;
			display: inline-grid;
			place-items: center;
			min-width: 1.4rem;
			height: 1.4rem;
			padding: 0 0.35rem;
			border: 1px solid var(--color-border);
			border-bottom-width: 2px;
			border-radius: 4px;
			background: var(--color-bg-tertiary);
			color: var(--color-text-secondary);
			font-size: 0.65rem;
			font-weight: 700;
		}
	}

	@media (min-width: 1400px) {
		.shell {
			grid-template-columns: 300px minmax(0, 1fr) 400px;
		}
		.hero { width: 340px; height: 340px; }
		.hero-pic { width: 230px; height: 230px; }
		.title { font-size: 3.6rem; }
	}

	@media (max-width: 420px) {
		.hero { width: 180px; height: 180px; }
		.hero-pic { width: 120px; height: 120px; }
		.title { font-size: 2rem; }
	}

	@keyframes pulse-grow {
		0%, 100% { opacity: 0.16; transform: scale(1); }
		50% { opacity: 0.32; transform: scale(1.25); }
	}
</style>
