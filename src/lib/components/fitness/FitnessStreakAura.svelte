<script>
	/**
	 * @type {{ value?: number, burst?: boolean }}
	 */
	let { value = 0, burst = false } = $props();

	let showBurst = $state(false);
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let burstTimer;

	$effect(() => {
		if (burst) {
			clearTimeout(burstTimer);
			showBurst = true;
			burstTimer = setTimeout(() => showBurst = false, 2000);
		}
	});

	// Phase 0: nothing       (< 1 week)
	// Phase 1: glow          (1+ weeks)
	// Phase 2: particles     (2+ weeks)
	// Phase 3: fire          (3+ weeks)
	// Phase 4: fire + lightning (6+ weeks), extra bolts at 12w and 24w
	const phase = $derived(
		value >= 6  ? 4 :
		value >= 3  ? 3 :
		value >= 2  ? 2 :
		value >= 1  ? 1 : 0
	);

	// Extra lightning bolts at higher streaks
	const bolts = $derived(
		value >= 24 ? 3 :
		value >= 12 ? 2 : 1
	);

	const burstParticles = [
		{ x: 10, y: 0,  size: 8,  delay: 0,    dur: 1.6 },
		{ x: 25, y: 5,  size: 10, delay: 0.05, dur: 1.8 },
		{ x: 40, y: 10, size: 12, delay: 0.02, dur: 2.0 },
		{ x: 55, y: 3,  size: 7,  delay: 0.1,  dur: 1.7 },
		{ x: 70, y: 8,  size: 9,  delay: 0.08, dur: 1.9 },
		{ x: 85, y: 2,  size: 11, delay: 0.12, dur: 1.6 },
		{ x: 15, y: 15, size: 6,  delay: 0.15, dur: 1.5 },
		{ x: 35, y: 20, size: 10, delay: 0.18, dur: 1.8 },
		{ x: 50, y: 12, size: 8,  delay: 0.07, dur: 2.0 },
		{ x: 65, y: 18, size: 7,  delay: 0.22, dur: 1.7 },
		{ x: 80, y: 25, size: 9,  delay: 0.1,  dur: 1.9 },
		{ x: 20, y: 30, size: 11, delay: 0.25, dur: 1.6 },
		{ x: 45, y: 22, size: 6,  delay: 0.03, dur: 1.8 },
		{ x: 60, y: 28, size: 10, delay: 0.2,  dur: 2.0 },
		{ x: 75, y: 15, size: 8,  delay: 0.14, dur: 1.5 },
		{ x: 30, y: 35, size: 12, delay: 0.28, dur: 1.7 },
		{ x: 5,  y: 10, size: 7,  delay: 0.06, dur: 1.9 },
		{ x: 90, y: 20, size: 9,  delay: 0.16, dur: 1.6 },
		{ x: 48, y: 32, size: 8,  delay: 0.3,  dur: 2.0 },
		{ x: 22, y: 8,  size: 10, delay: 0.11, dur: 1.8 },
		{ x: 68, y: 35, size: 6,  delay: 0.23, dur: 1.5 },
		{ x: 38, y: 5,  size: 11, delay: 0.04, dur: 1.7 },
		{ x: 82, y: 30, size: 7,  delay: 0.26, dur: 1.9 },
		{ x: 52, y: 18, size: 9,  delay: 0.09, dur: 1.6 },
	];
</script>

<div class="aura phase-{phase}">
	{#if phase >= 2}
		<div class="fire">
			<div class="fire-left">
				{#if phase >= 3}<div class="main-fire"></div>{/if}
				<div class="particle-fire"></div>
			</div>
			<div class="fire-center">
				{#if phase >= 3}<div class="main-fire"></div>{/if}
				<div class="particle-fire"></div>
			</div>
			<div class="fire-right">
				{#if phase >= 3}<div class="main-fire"></div>{/if}
				<div class="particle-fire"></div>
			</div>
			<div class="fire-bottom">
				{#if phase >= 3}<div class="main-fire"></div>{/if}
			</div>
		</div>
	{/if}

	{#if phase >= 4}
		<div class="lightning">
			<svg class="bolt bolt-1" viewBox="0 0 30 80" xmlns="http://www.w3.org/2000/svg">
				<polyline points="15,0 8,28 18,32 6,58 16,62 4,80" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="bevel"/>
			</svg>
			{#if bolts >= 2}
				<svg class="bolt bolt-2" viewBox="0 0 30 80" xmlns="http://www.w3.org/2000/svg">
					<polyline points="12,0 20,24 10,30 22,55 12,60 20,80" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="bevel"/>
				</svg>
			{/if}
			{#if bolts >= 3}
				<svg class="bolt bolt-3" viewBox="0 0 30 80" xmlns="http://www.w3.org/2000/svg">
					<polyline points="18,0 10,20 20,26 8,50 18,55 10,80" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="bevel"/>
				</svg>
			{/if}
		</div>
	{/if}

	{#if showBurst}
		<div class="burst-particles">
			{#each burstParticles as p, i (i)}
				<div
					class="bp"
					style:left="{p.x}%"
					style:bottom="{p.y}%"
					style:width="{p.size}px"
					style:height="{p.size}px"
					style:animation-delay="{p.delay}s"
					style:animation-duration="{p.dur}s"
				></div>
			{/each}
		</div>
	{/if}

	<span class="number">{value}</span>
</div>

<style>
	/* Base layout */
	.aura {
		position: relative;
		width: 88px;
		display: grid;
		place-items: center;
	}
	.aura.phase-3,
	.aura.phase-4 {
		height: 88px;
	}

	.number {
		position: relative;
		z-index: 5;
		font-size: 2.5rem;
		font-weight: 700;
		color: var(--nord13);
		--shadow-outline: 0 0 1px rgba(255,255,255,0.9), 0 0 3px rgba(0,0,0,0.4);
	}

	/* Phase 1 - Glow (1 week) */
	.phase-1 .number {
		text-shadow:
			0 0 8px rgba(255,215,100,.5),
			0 0 16px rgba(255,215,100,.35);
		animation: glow-pulse 2.5s ease-in-out infinite;
	}
	@keyframes glow-pulse {
		0%,100% { text-shadow: 0 0 8px rgba(255,215,100,.4); }
		50% { text-shadow: 0 0 16px rgba(255,215,100,.8); }
	}

	/* Phase 2/3 - Ember text shadow (2-3 weeks) */
	.phase-2 .number,
	.phase-3 .number,
	.phase-4 .number {
		animation: ember-pulse 1.4s infinite alternate;
	}
	@keyframes ember-pulse {
		0% {
			text-shadow:
				var(--shadow-outline),
				0 0 6px rgba(255,140,0,.6),
				0 0 12px rgba(255,90,0,.4),
				0 0 20px rgba(255,50,0,.2);
		}
		100% {
			text-shadow:
				var(--shadow-outline),
				0 0 10px rgba(255,180,0,.9),
				0 0 18px rgba(255,120,0,.6),
				0 0 28px rgba(255,70,0,.35);
		}
	}

	/* Fire effect */
	.fire {
		position: absolute;
		bottom: -10px;
		left: 50%;
		transform: translateX(-50%) scale(0.55);
		width: 100px;
		height: 100px;
		pointer-events: none;
		z-index: 4;
	}

	@keyframes scaleUpDown {
		0%   { transform: scaleY(1) scaleX(1); }
		25%  { transform: scaleY(1.1) scaleX(0.92); }
		50%  { transform: scaleY(0.92) scaleX(1.08); }
		75%  { transform: scaleY(1.08) scaleX(0.9); }
		100% { transform: scaleY(1) scaleX(1); }
	}
	@keyframes shake {
		0%,100% { transform: skewX(0) scale(1); }
		50% { transform: skewX(5deg) scale(0.9); }
	}
	@keyframes particleUp {
		0% { opacity: 0; }
		20% { opacity: 1; }
		80% { opacity: 1; }
		100% { opacity: 0; top: -100%; transform: scale(0.5); }
	}
	@keyframes glow {
		0%,100% { background-color: #ef5a00; }
		50% { background-color: #ff7800; }
	}

	.fire-center,
	.fire-left,
	.fire-right {
		position: absolute;
		width: 100%;
		height: 100%;
		transform-origin: bottom center;
	}
	.fire-center { animation: scaleUpDown 1.5s ease-out infinite; }
	.fire-left { animation: shake 1.6s ease-out infinite; }
	.fire-right { animation: shake 1.1s ease-out infinite; }

	.main-fire {
		position: absolute;
		width: 100%;
		height: 100%;
		background-image: radial-gradient(
			farthest-corner at 10px 0,
			color-mix(in srgb, var(--nord11) 70%, transparent),
			color-mix(in srgb, var(--nord12) 70%, transparent) 60%,
			color-mix(in srgb, var(--nord13) 85%, transparent) 95%
		);
		filter: drop-shadow(0 0 6px var(--nord12));
		transform: scaleX(0.8) rotate(45deg);
		border-radius: 0 40% 60% 40%;
	}
	.fire-left .main-fire { top: 15%; left: -20%; width: 80%; height: 80%; }
	.fire-right .main-fire { top: 15%; right: -25%; width: 80%; height: 80%; }

	.particle-fire {
		position: absolute;
		width: 10px;
		height: 10px;
		background-color: var(--nord13);
		filter: drop-shadow(0 0 4px var(--nord12));
		border-radius: 50%;
		animation: particleUp 1.4s ease-out infinite;
	}
	.fire-center .particle-fire { top: 60%; left: 45%; }
	.fire-left .particle-fire { top: 20%; left: 20%; animation-duration: 1.8s; }
	.fire-right .particle-fire { top: 45%; left: 50%; width: 15px; height: 15px; }

	.fire-bottom .main-fire {
		position: absolute;
		top: 30%;
		left: 20%;
		width: 75%;
		height: 75%;
		background-color: #ff7800;
		transform: scaleX(0.8) rotate(45deg);
		border-radius: 0 40% 100% 40%;
		filter: blur(10px);
		animation: glow 1s ease-out infinite;
	}

	/* Burst particles */
	.burst-particles {
		position: absolute;
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 60px;
		height: 80px;
		pointer-events: none;
		z-index: 6;
	}
	.burst-particles .bp {
		position: absolute;
		background-color: var(--nord13);
		filter: drop-shadow(0 0 4px var(--nord12));
		border-radius: 50%;
		opacity: 0;
		animation: burstParticleUp 2s ease-out forwards;
	}
	@keyframes burstParticleUp {
		0% { transform: translateY(0) scale(1); opacity: 0; }
		10% { opacity: 1; }
		60% { opacity: 0.8; }
		100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
	}

	/* Lightning */
	.lightning {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 7;
	}
	.bolt {
		position: absolute;
		height: 70px;
		width: 24px;
		color: #eaf6ff;
		filter: drop-shadow(0 0 4px rgba(180,220,255,.9)) drop-shadow(0 0 8px rgba(120,180,255,.6));
		opacity: 0;
	}
	/* Bolt 1: left side */
	.bolt-1 {
		top: -20px;
		left: -8px;
		transform: rotate(-15deg);
		animation: lightning-1 3.2s step-end infinite;
	}
	/* Bolt 2: right side */
	.bolt-2 {
		top: -18px;
		right: -6px;
		transform: rotate(12deg);
		animation: lightning-2 4.1s step-end infinite;
	}
	/* Bolt 3: center-left */
	.bolt-3 {
		top: -22px;
		left: 12px;
		transform: rotate(-5deg);
		animation: lightning-3 2.8s step-end infinite;
	}

	/* Each bolt: mostly invisible, brief double-flash spikes */
	@keyframes lightning-1 {
		0%  { opacity: 0; }
		12% { opacity: 0.9; }
		14% { opacity: 0; }
		16% { opacity: 1; }
		18% { opacity: 0; }
		65% { opacity: 0; }
		67% { opacity: 0.8; }
		69% { opacity: 0; }
		100% { opacity: 0; }
	}
	@keyframes lightning-2 {
		0%  { opacity: 0; }
		35% { opacity: 0; }
		37% { opacity: 1; }
		39% { opacity: 0; }
		41% { opacity: 0.7; }
		43% { opacity: 0; }
		82% { opacity: 0.9; }
		84% { opacity: 0; }
		100% { opacity: 0; }
	}
	@keyframes lightning-3 {
		0%  { opacity: 0; }
		22% { opacity: 0; }
		24% { opacity: 1; }
		25% { opacity: 0; }
		27% { opacity: 0.8; }
		28% { opacity: 0; }
		55% { opacity: 0.9; }
		57% { opacity: 0; }
		58% { opacity: 0.7; }
		59% { opacity: 0; }
		100% { opacity: 0; }
	}
</style>
