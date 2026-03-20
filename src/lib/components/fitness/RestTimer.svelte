<script>
	/**
	 * @type {{
	 *   seconds: number,
	 *   total: number,
	 *   onComplete?: (() => void) | null,
	 *   onAdjust?: ((delta: number) => void) | null,
	 *   onSkip?: (() => void) | null
	 * }}
	 */
	let { seconds, total, onComplete = null, onAdjust = null, onSkip = null } = $props();

	const progress = $derived(total > 0 ? seconds / total : 0);

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

<div class="rest-bar">
	<div class="bar-fill" style:width="{progress * 100}%"></div>
	<div class="bar-controls">
		<button class="adjust-btn" onclick={() => onAdjust?.(-30)}>-30s</button>
		<button class="time-btn" onclick={() => onSkip?.()}>{formatTime(seconds)}</button>
		<button class="adjust-btn" onclick={() => onAdjust?.(30)}>+30s</button>
	</div>
</div>

<style>
	.rest-bar {
		border-radius: 8px;
		overflow: hidden;
		position: relative;
		height: 2.2rem;
		background: var(--color-bg-elevated);
	}
	.bar-fill {
		position: absolute;
		inset: 0;
		width: 100%;
		background: var(--color-primary);
		border-radius: 8px;
		transition: width 1s linear;
	}
	.bar-controls {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		z-index: 1;
	}
	.time-btn {
		background: none;
		border: none;
		font-size: 0.9rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary, inherit);
		cursor: pointer;
		padding: 0.2rem 0.5rem;
	}
	.adjust-btn {
		background: none;
		border: none;
		color: var(--color-text-primary, inherit);
		cursor: pointer;
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		opacity: 0.7;
	}
	.adjust-btn:hover {
		opacity: 1;
	}
</style>
