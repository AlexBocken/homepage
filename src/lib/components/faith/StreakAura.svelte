<script lang="ts">
	import FireEffect from './FireEffect.svelte';

	interface Props {
		value?: number;
		burst?: boolean;
	}

	let { value = 0, burst = false }: Props = $props();

	// Latch burst so the FireEffect stays mounted for the full animation
	let showBurst = $state(false);
	let burstTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (burst) {
			clearTimeout(burstTimer);
			showBurst = true;
			burstTimer = setTimeout(() => showBurst = false, 2000);
		}
	});

	const phase = $derived(
		value >= 365 ? 6 :
		value >= 180 ? 5 :
		value >= 90  ? 4 :
		value >= 30  ? 3 :
		value >= 14  ? 2 :
		value >= 7   ? 1 : 0
	);
</script>

<div class="aura phase-{phase}" class:holy-fire={phase>=4}>
	{#if phase >= 6}
		<div class="wing left">
		<svg viewBox="0 0 91.871681 77.881462" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(-52.477632,-104.97065)">
   <path d="m 85.574148,126.32647 c 18.072102,-19.56175 30.274102,-22.98334 39.785082,-20.76506 9.511,2.21826 19.51366,9.15611 18.96878,29.09808 -0.54488,19.94196 -8.19899,32.59335 -9.5936,33.90688 -1.39462,1.31353 -3.57898,1.31075 -6.51179,2.71347 -2.55794,1.22341 -2.94677,4.76843 -7.73616,6.52744 -5.5551,2.04023 -9.62876,-2.264 -13.20665,-3.0632 -5.81575,-1.2991 -6.82149,3.71895 -12.602091,4.60267 -8.390895,1.28278 -9.861661,-5.68162 -14.831326,-3.50879 -4.969644,2.1728 -12.234764,11.49793 -22.596805,4.55731 -17.23226,-11.54237 20.720254,-45.6491 28.32456,-54.0688 z"/>

 </g>
</svg>
</div>
<div class="wing right">
		<svg viewBox="0 0 91.871681 77.881462" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(-52.477632,-104.97065)">
	      <path d="m 85.574148,126.32647 c 18.072102,-19.56175 30.274102,-22.98334 39.785082,-20.76506 9.511,2.21826 19.51366,9.15611 18.96878,29.09808 -0.54488,19.94196 -8.19899,32.59335 -9.5936,33.90688 -1.39462,1.31353 -3.57898,1.31075 -6.51179,2.71347 -2.55794,1.22341 -2.94677,4.76843 -7.73616,6.52744 -5.5551,2.04023 -9.62876,-2.264 -13.20665,-3.0632 -5.81575,-1.2991 -6.82149,3.71895 -12.602091,4.60267 -8.390895,1.28278 -9.861661,-5.68162 -14.831326,-3.50879 -4.969644,2.1728 -12.234764,11.49793 -22.596805,4.55731 -17.23226,-11.54237 20.720254,-45.6491 28.32456,-54.0688 z"/>
 </g>
</svg>
</div>
{/if}
	{#if phase >= 5}
		<div class="halo" ></div>
	{/if}


	{#if phase >= 2}
		<FireEffect holy={phase>=4} />
	{/if}

	{#if showBurst}
		<FireEffect holy={phase>=4} burst />
	{/if}

	<span class="number">{value}</span>
</div>

<style>
/* =====================
   BASE LAYOUT
===================== */
.aura {
	position: relative;
	width: 88px;
	display: grid;
	place-items: center;
}
.aura.phase-3,
.aura.phase-4,
.aura.phase-5,
.aura.phase-6
{
	height: 88px;
}

.number {
	position: relative;
	z-index: 5;
	font-size: 2.5rem;
	font-weight: 700;
	color: var(--nord13);
	--shadow-outline:  0 0 1px rgba(255,255,255,0.9), 0 0 3px rgba(0,0,0,0.4);
}

/* =====================
   PHASE 1 – GLOW
===================== */
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

/* =====================
   PHASE 3 – HALO
===================== */
.halo {
	position: absolute;
	top: -6px;
	width: 70px;
	height: 20px;
	border-radius: 50%;
	border: 4px solid rgba(255,235,180,.9);
	box-shadow:
		0 0 12px rgba(255,235,180,.8),
		0 0 20px rgba(255,235,180,.5);
	animation: halo-float 3s ease-in-out infinite;
	z-index: 3;
}

@keyframes halo-float {
	0%,100% { transform: translateY(0); }
	50% { transform: translateY(-4px); }
}

/* =====================
   PHASE 4 – WINGS
===================== */
.wing {
  position: absolute;
  top: 20%;
  width: 36px;
  height: 64px;
  z-index: 0;
  pointer-events: none;
  transform-origin: top center;
 	filter: drop-shadow(0 0 3px white);

}

.wing svg {
  width: 100%;
  height: 100%;
  fill: white;
}
.wing.left {
  left: -18px;
  transform: rotate(-10deg);
  animation: wing-slow-fly-left 4s ease-in-out infinite alternate;
}

.wing.right {
  right: -18px;
  transform: scaleX(-1) rotate(-10deg);
  animation: wing-slow-fly-right 4s ease-in-out infinite alternate;
}

/* slow back-and-forth rotation for a gentle flight */
@keyframes wing-slow-fly-left {
  0%   { transform: rotate(10deg); }
  50%  { transform: rotate(0deg); }
  100% { transform: rotate(10deg); }
}

@keyframes wing-slow-fly-right {
  0%   { transform: scaleX(-1) rotate(10deg); }
  50%  { transform: scaleX(-1) rotate(0deg); }
  100% { transform: scaleX(-1) rotate(10deg); }
}

/* =====================
   EMBER TEXT SHADOW
===================== */
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

.holy-fire .number {
	animation: holy-ember 1.8s infinite alternate;
	color: #eaf6ff;
	--shadow-outline: 0 0 5px rgba(0,0,0,0.7);
}

@keyframes holy-ember {
	0% {
		text-shadow:
			var(--shadow-outline),
			0 0 6px rgba(180,220,255,.6),
			0 0 14px rgba(120,180,255,.45),
			0 0 24px rgba(80,140,255,.3);
	}
	100% {
		text-shadow:
			var(--shadow-outline),
			0 0 12px rgba(220,245,255,.95),
			0 0 22px rgba(160,210,255,.7),
			0 0 36px rgba(100,160,255,.45);
	}
}
</style>
