<script>
	import RingGraph from './RingGraph.svelte';
	import { RADIUS, ARC_DEGREES, ARC_ROTATE } from './RingGraph.svelte';

	/**
	 * @type {{
	 *   percent: number,
	 *   color: string,
	 *   label?: string,
	 *   sublabel?: string,
	 *   target?: number,
	 *   markerColor?: string,
	 * }}
	 */
	let {
		percent = 0,
		color = 'currentColor',
		label = '',
		sublabel = '',
		target = undefined,
		markerColor = 'var(--color-text-secondary)',
	} = $props();

	/**
	 * Get SVG coordinates for a triangle marker + label at a given percentage on the arc.
	 * @param {number} pct
	 */
	function targetMarkerPos(pct) {
		const angleDeg = ARC_ROTATE + (pct / 100) * ARC_DEGREES;
		const angleRad = (angleDeg * Math.PI) / 180;
		const outerR = RADIUS + 7;
		const cx = 35 + outerR * Math.cos(angleRad);
		const cy = 35 + outerR * Math.sin(angleRad);
		// Label positioning: primarily radial, with tangential nudge near 50%
		const closeness = 1 - Math.abs(pct - 50) / 50;
		const highBonus = pct > 50 && closeness < 0.4 ? 4 : 0;
		const midBump = Math.max(0, 1 - Math.abs(closeness - 0.2) / 0.3) * 4;
		const labelR = outerR + 17 + highBonus + midBump - closeness * closeness * 14;
		const tOff = closeness * closeness * 14;
		const dir = pct < 50 ? -1 : 1;
		const tangentRad = angleRad + dir * Math.PI / 2;
		const lx = 35 + labelR * Math.cos(angleRad) + tOff * Math.cos(tangentRad);
		const ly = 35 + labelR * Math.sin(angleRad) + tOff * Math.sin(tangentRad);
		return { cx, cy, lx, ly, angleDeg };
	}
</script>

<RingGraph {percent} {color} {label} {sublabel}>
	{#snippet extra()}
		{#if target != null}
			{@const pos = targetMarkerPos(target)}
			<path
				fill={markerColor}
				opacity="0.85"
				stroke={markerColor}
				stroke-width="0.8"
				stroke-linejoin="round"
				d="M{pos.cx},{pos.cy - 3.5}L{pos.cx - 3},{pos.cy + 2.5}L{pos.cx + 3},{pos.cy + 2.5}Z"
				transform="rotate({pos.angleDeg - 90} {pos.cx} {pos.cy})"
			/>
			<text
				class="target-label"
				fill={markerColor}
				x={pos.lx}
				y={pos.ly}
				text-anchor="middle"
				dominant-baseline="central"
			>{target}%</text>
		{/if}
	{/snippet}
</RingGraph>

<style>
	.target-label {
		font-size: 7px;
		font-weight: 700;
	}
</style>
