<script module>
	export const RADIUS = 28;
	export const ARC_DEGREES = 300;
	export const ARC_LENGTH = (ARC_DEGREES / 360) * 2 * Math.PI * RADIUS;
	export const ARC_ROTATE = 120;

	/** @param {number} percent */
	export function strokeOffset(percent) {
		return ARC_LENGTH - (Math.min(percent, 100) / 100) * ARC_LENGTH;
	}
</script>

<script>
	/**
	 * @type {{
	 *   percent: number,
	 *   color: string,
	 *   label?: string,
	 *   sublabel?: string,
	 *   extra?: import('svelte').Snippet,
	 * }}
	 */
	let {
		percent = 0,
		color = 'currentColor',
		label = '',
		sublabel = '',
		extra = undefined,
	} = $props();
</script>

<div class="ring-wrap">
	<svg class="ring-svg" viewBox="0 0 70 70">
		<circle class="ring-bg" cx="35" cy="35" r={RADIUS}
			stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
			transform="rotate({ARC_ROTATE} 35 35)" />
		<circle class="ring-fill" cx="35" cy="35" r={RADIUS}
			stroke-dasharray="{ARC_LENGTH} {2 * Math.PI * RADIUS}"
			stroke-dashoffset={strokeOffset(percent)}
			transform="rotate({ARC_ROTATE} 35 35)"
			stroke={color} />
		{@render extra?.()}
		<text class="ring-text" x="35" y="35">{percent}%</text>
	</svg>
	{#if label}
		<span class="ring-label">{label}</span>
	{/if}
	{#if sublabel}
		<span class="ring-sublabel">{sublabel}</span>
	{/if}
</div>

<style>
	.ring-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		flex: 1;
	}
	.ring-svg {
		width: 72px;
		height: 72px;
		overflow: visible;
	}
	.ring-bg {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 5;
		stroke-linecap: round;
	}
	.ring-fill {
		fill: none;
		stroke-width: 5;
		stroke-linecap: round;
		transition: stroke-dashoffset 0.4s ease;
	}
	.ring-text {
		font-size: 14px;
		font-weight: 700;
		fill: currentColor;
		text-anchor: middle;
		dominant-baseline: central;
	}
	.ring-label {
		font-size: 0.78rem;
		font-weight: 600;
		color: var(--color-text-primary);
		text-align: center;
	}
	.ring-sublabel {
		font-size: 0.72rem;
		color: var(--color-text-tertiary);
	}
</style>
