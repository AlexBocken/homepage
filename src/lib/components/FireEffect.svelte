<!-- FireEffect.svelte -->
<script lang="ts">
	interface Props {
		holy?: boolean;
		burst?: boolean;
	}

	let { holy = false, burst = false }: Props = $props();

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

{#if burst}
<div class="burst-particles" class:holy-fire={holy}>
	{#each burstParticles as p}
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
{:else}
<div class="fire" class:holy-fire={holy}>
	<div class="fire-left">
		<div class="main-fire"></div>
		<div class="particle-fire"></div>
	</div>

	<div class="fire-center">
		<div class="main-fire"></div>
		<div class="particle-fire"></div>
	</div>

	<div class="fire-right">
		<div class="main-fire"></div>
		<div class="particle-fire"></div>
	</div>

	<div class="fire-bottom">
		<div class="main-fire"></div>
	</div>
</div>
{/if}

<style>
/* =====================
   PURE CSS FIRE (SCALED + RISING)
===================== */
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

/* ---------- animations ---------- */
@keyframes scaleUpDown {
	0%,100% { transform: scaleY(1) scaleX(1); }
	50%,90% { transform: scaleY(1.1); }
	75% { transform: scaleY(0.95); }
	80% { transform: scaleX(0.95); }
}

@keyframes shake {
	0%,100% { transform: skewX(0) scale(1); }
	50% { transform: skewX(5deg) scale(0.9); }
}

@keyframes particleUp {
	0% { opacity: 0; }
	20% { opacity: 1; }
	80% { opacity: 1; }
	100% {
		opacity: 0;
		top: -100%;
		transform: scale(0.5);
	}
}

@keyframes glow {
	0%,100% { background-color: #ef5a00; }
	50% { background-color: #ff7800; }
}

/* ---------- fire structure ---------- */
.fire-center,
.fire-left,
.fire-right {
	position: absolute;
	width: 100%;
	height: 100%;
}

.fire-center {
	animation: scaleUpDown 3s ease-out infinite;
}

.fire-left {
	animation: shake 3s ease-out infinite;
}

.fire-right {
	animation: shake 2s ease-out infinite;
}

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

.fire-left .main-fire {
	top: 15%;
	left: -20%;
	width: 80%;
	height: 80%;
}

.fire-right .main-fire {
	top: 15%;
	right: -25%;
	width: 80%;
	height: 80%;
}

.particle-fire {
	position: absolute;
	width: 10px;
	height: 10px;
	background-color: var(--nord13);
	filter: drop-shadow(0 0 4px var(--nord12));
	border-radius: 50%;
	animation: particleUp 2.5s ease-out infinite;
}

.fire-center .particle-fire {
	top: 60%;
	left: 45%;
}

.fire-left .particle-fire {
	top: 20%;
	left: 20%;
	animation-duration: 3s;
}

.fire-right .particle-fire {
	top: 45%;
	left: 50%;
	width: 15px;
	height: 15px;
}

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
	animation: glow 2s ease-out infinite;
}

/* =====================
   HOLY (BLUE-WHITE) FIRE
===================== */
.holy-fire .main-fire {
	background-image: radial-gradient(
		farthest-corner at 10px 0,
		#9fd4ff 0%,
		#eaf6ff 95%
	);
	filter: drop-shadow(0 0 12px rgba(180,220,255,.9));
}

.holy-fire .particle-fire {
	background-color: #eaf6ff;
	filter: drop-shadow(0 0 12px rgba(180,220,255,.9));
}

.holy-fire .fire-bottom .main-fire {
	background-color: #d6ecff;
}

/* =====================
   BURST – particles only
===================== */
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

.burst-particles.holy-fire .bp {
	background-color: #eaf6ff;
	filter: drop-shadow(0 0 12px rgba(180,220,255,.9));
}

@keyframes burstParticleUp {
	0% {
		transform: translateY(0) scale(1);
		opacity: 0;
	}
	10% {
		opacity: 1;
	}
	60% {
		opacity: 0.8;
	}
	100% {
		transform: translateY(-80px) scale(0.3);
		opacity: 0;
	}
}
</style>
