<script lang="ts">
	// Dual-thumb range slider: one track, two handles (lower + upper bound).
	// Custom pointer/keyboard implementation rather than two overlaid
	// <input type=range> elements — the latter lock up when both thumbs
	// coincide at an edge. Here a drag that crosses the other thumb hands off
	// to it, so the range is always adjustable.
	interface Props {
		label: string;
		/** Track extent (data floor / ceiling). */
		min: number;
		max: number;
		step?: number;
		/** Current lower bound. Bindable. */
		low: number;
		/** Current upper bound. Bindable. */
		high: number;
		/** Renders a value for the readout + aria-valuetext. */
		format?: (v: number) => string;
		/** Optional distribution bars drawn above the track (left→right over min..max). */
		histogram?: number[];
		/** When true, the LAST histogram bar is an ">max" overflow bin (rendered apart). */
		overflow?: boolean;
		/** Called when a drag ends or a key adjustment is made (not on every move). */
		oncommit?: () => void;
	}

	let {
		label,
		min,
		max,
		step = 1,
		low = $bindable(),
		high = $bindable(),
		format = (v) => String(v),
		histogram = [],
		overflow = false,
		oncommit
	}: Props = $props();

	const histMax = $derived(histogram.length ? Math.max(1, ...histogram) : 1);
	// In-range bars span [min, max]; the overflow bin (if any) sits beyond max.
	const inRangeBars = $derived(histogram.length - (overflow ? 1 : 0));
	function bucketActive(i: number) {
		if (overflow && i === histogram.length - 1) return high >= max;
		const bw = (max - min) / inRangeBars;
		const lo = min + i * bw;
		const hi = min + (i + 1) * bw;
		return hi >= low && lo <= high;
	}

	let trackEl = $state<HTMLElement>();
	let lowThumb = $state<HTMLElement>();
	let highThumb = $state<HTMLElement>();
	let dragging = $state<null | 'low' | 'high'>(null);

	const span = $derived(Math.max(1, max - min));
	// Clamp for display so an out-of-range initial value (e.g. ±Infinity
	// before the data defaults land) still paints a sane thumb position.
	const lowPct = $derived(((Math.min(Math.max(low, min), max) - min) / span) * 100);
	const highPct = $derived(((Math.min(Math.max(high, min), max) - min) / span) * 100);

	function snap(v: number) {
		return Math.round(v / step) * step;
	}

	function setLow(v: number) {
		low = Math.min(Math.max(snap(v), min), high);
	}

	function setHigh(v: number) {
		high = Math.max(Math.min(snap(v), max), low);
	}

	function valueFromClientX(clientX: number) {
		if (!trackEl) return min;
		const r = trackEl.getBoundingClientRect();
		const ratio = r.width > 0 ? (clientX - r.left) / r.width : 0;
		return min + Math.min(Math.max(ratio, 0), 1) * (max - min);
	}

	// Move the active thumb; if it crosses the other one, hand the drag over so
	// dragging stays continuous instead of stalling at the collision point.
	function update(which: 'low' | 'high', raw: number) {
		const v = Math.min(Math.max(snap(raw), min), max);
		if (which === 'low') {
			if (v > high) {
				dragging = 'high';
				highThumb?.focus();
				setHigh(v);
			} else setLow(v);
		} else {
			if (v < low) {
				dragging = 'low';
				lowThumb?.focus();
				setLow(v);
			} else setHigh(v);
		}
	}

	function onTrackPointerDown(e: PointerEvent) {
		e.preventDefault();
		const v = valueFromClientX(e.clientX);
		const which: 'low' | 'high' = Math.abs(v - low) <= Math.abs(v - high) ? 'low' : 'high';
		dragging = which;
		(which === 'low' ? lowThumb : highThumb)?.focus();
		trackEl?.setPointerCapture(e.pointerId);
		update(which, v);
	}

	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		update(dragging, valueFromClientX(e.clientX));
	}

	function onPointerUp() {
		if (dragging) oncommit?.();
		dragging = null;
	}

	function onThumbKey(e: KeyboardEvent, which: 'low' | 'high') {
		const big = step * 10;
		let delta = 0;
		switch (e.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				delta = step;
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				delta = -step;
				break;
			case 'PageUp':
				delta = big;
				break;
			case 'PageDown':
				delta = -big;
				break;
			case 'Home':
				e.preventDefault();
				if (which === 'low') setLow(min);
				else setHigh(low);
				return;
			case 'End':
				e.preventDefault();
				if (which === 'low') setLow(high);
				else setHigh(max);
				return;
			default:
				return;
		}
		e.preventDefault();
		if (which === 'low') setLow(low + delta);
		else setHigh(high + delta);
		oncommit?.();
	}
</script>

<div class="rs">
	<div class="rs-head">
		<span class="rs-label">{label}</span>
		<span class="rs-value">{format(low)} – {format(high)}</span>
	</div>
	{#if histogram.length > 1}
		<div class="rs-hist" aria-hidden="true">
			{#each histogram as c, i (i)}
				{@const isOverflow = overflow && i === histogram.length - 1}
				<div
					class="rs-bar"
					class:active={bucketActive(i)}
					class:overflow={isOverflow}
					style="height: {(c / histMax) * 100}%"
					title={isOverflow ? `> ${format(max)}` : undefined}
				></div>
			{/each}
		</div>
	{/if}
	<div
		class="rs-track"
		role="group"
		aria-label={label}
		bind:this={trackEl}
		onpointerdown={onTrackPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
	>
		<div class="rs-rail"></div>
		<div class="rs-fill" style="left: {lowPct}%; right: {100 - highPct}%;"></div>
		<button
			type="button"
			class="rs-thumb"
			class:active={dragging === 'low'}
			bind:this={lowThumb}
			style="left: {lowPct}%"
			role="slider"
			tabindex="0"
			aria-label="{label} Minimum"
			aria-valuemin={min}
			aria-valuemax={high}
			aria-valuenow={low}
			aria-valuetext={format(low)}
			onkeydown={(e) => onThumbKey(e, 'low')}
		></button>
		<button
			type="button"
			class="rs-thumb"
			class:active={dragging === 'high'}
			bind:this={highThumb}
			style="left: {highPct}%"
			role="slider"
			tabindex="0"
			aria-label="{label} Maximum"
			aria-valuemin={low}
			aria-valuemax={max}
			aria-valuenow={high}
			aria-valuetext={format(high)}
			onkeydown={(e) => onThumbKey(e, 'high')}
		></button>
	</div>
</div>

<style>
	.rs {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.rs-head {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}

	.rs-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-tertiary);
	}

	.rs-value {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}

	/* Distribution bars sit directly above the track and share its width, so a
	   bar lines up with the slider position covering the same value range. */
	.rs-hist {
		display: flex;
		align-items: flex-end;
		gap: 1px;
		height: 2.2rem;
		padding: 0 0.5rem; /* match the thumb half-width so bars align with track ends */
	}

	.rs-bar {
		flex: 1;
		min-height: 2px;
		border-radius: 2px 2px 0 0;
		background: var(--color-bg-elevated);
		transition: background-color var(--transition-fast);
	}

	.rs-bar.active {
		background: color-mix(in srgb, var(--color-primary) 45%, transparent);
	}

	/* Overflow bin (">max") — set apart from the in-range bars with a gap and a
	   distinct tint so it doesn't read as part of the linear axis. */
	.rs-bar.overflow {
		margin-left: 0.5rem;
		border-radius: 2px;
	}

	.rs-bar.overflow.active {
		background: color-mix(in srgb, var(--orange) 50%, transparent);
	}

	.rs-track {
		position: relative;
		height: 1.25rem;
		touch-action: none;
		cursor: pointer;
	}

	.rs-rail,
	.rs-fill {
		position: absolute;
		top: 50%;
		height: 0.3rem;
		transform: translateY(-50%);
		border-radius: var(--radius-pill);
	}

	.rs-rail {
		left: 0;
		right: 0;
		background: var(--color-bg-elevated);
	}

	.rs-fill {
		background: var(--color-primary);
	}

	.rs-thumb {
		position: absolute;
		top: 50%;
		width: 1.05rem;
		height: 1.05rem;
		margin: 0;
		padding: 0;
		transform: translate(-50%, -50%);
		border-radius: 50%;
		background: var(--color-surface);
		border: 2px solid var(--color-primary);
		box-shadow: var(--shadow-sm);
		cursor: grab;
		appearance: none;
		transition: scale var(--transition-fast);
	}

	.rs-thumb:hover {
		scale: 1.1;
	}

	.rs-thumb:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.rs-thumb.active {
		cursor: grabbing;
		scale: 1.15;
	}
</style>
