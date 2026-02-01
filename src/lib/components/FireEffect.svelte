<!-- FireEffect.svelte -->
<script lang="ts">
	interface Props {
		holy?: boolean;
		burst?: boolean;
	}

	let { holy = false, burst = false }: Props = $props();
</script>

<div class="fire {burst ? 'burst' : ''}" class:holy-fire={holy}>
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
	/*filter: drop-shadow(0 0 10px #d43322);*/
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
/* ===== BURST OVERRIDE ===== */
.fire.burst {
	animation: flame-burst 600ms ease-out forwards;
}

.fire.burst .particle-fire {
	animation: particleBurst 600ms ease-out forwards;
}

@keyframes flame-burst {
	0% {
		transform: translateX(-50%) scale(0.1) translateY(0%);
		opacity: 0;
	}
	30% {
		opacity: 1;
	}
	100% {
		transform: translateX(-50%) scale(2) translateY(-10%);
		opacity: 0;
	}
}

@keyframes particleBurst {
	0% { opacity: 0; }
	30% { opacity: 1; }
	100% {
		transform: translateY(-120px) scale(0.3);
		opacity: 0;
	}
}
</style>
