<script>
	/**
	 * @type {{
	 *   seconds: number,
	 *   total: number,
	 *   onComplete?: (() => void) | null
	 * }}
	 */
	let { seconds, total, onComplete = null } = $props();

	const radius = 40;
	const circumference = 2 * Math.PI * radius;
	const progress = $derived(total > 0 ? (total - seconds) / total : 0);
	const offset = $derived(circumference * (1 - progress));

	/** @param {number} secs */
	function formatTime(secs) {
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	$effect(() => {
		if (seconds <= 0 && total > 0) {
			onComplete?.();
		}
	});
</script>

<div class="rest-timer">
	<svg viewBox="0 0 100 100" class="timer-ring">
		<circle cx="50" cy="50" r={radius} class="bg-ring" />
		<circle
			cx="50" cy="50" r={radius}
			class="progress-ring"
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
			transform="rotate(-90 50 50)"
		/>
	</svg>
	<span class="timer-text">{formatTime(seconds)}</span>
</div>

<style>
	.rest-timer {
		position: relative;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100px;
		height: 100px;
	}
	.timer-ring {
		position: absolute;
		inset: 0;
	}
	.bg-ring {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 4;
	}
	.progress-ring {
		fill: none;
		stroke: var(--color-primary);
		stroke-width: 4;
		stroke-linecap: round;
		transition: stroke-dashoffset 1s linear;
	}
	.timer-text {
		font-size: 1.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-primary);
		z-index: 1;
	}
</style>
