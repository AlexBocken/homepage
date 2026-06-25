<script>
	import { onDestroy, onMount, untrack } from 'svelte';
	import {
		ExerciseCoach,
		FORM_CONFIGS,
		POSE_CONNECTIONS,
		hasFormConfig
	} from '$lib/js/poseCoach';
	import { playSetCompleteSound, playRepWarningSound } from '$lib/js/fitnessSounds';
	import { loadPoseLandmarker, isPoseModelReady } from '$lib/js/poseLandmarker';
	import { m } from '$lib/js/fitnessI18n';
	import CameraOff from '@lucide/svelte/icons/camera-off';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import X from '@lucide/svelte/icons/x';

	/**
	 * @type {{
	 *   exerciseId: string,
	 *   lang?: 'en' | 'de',
	 *   onrep?: (reps: number) => void,
	 *   onclose?: () => void,
	 *   resetKey?: number | string,
	 * }}
	 */
	let {
		exerciseId,
		lang = 'en',
		onrep = undefined,
		onclose = undefined,
		resetKey = 0
	} = $props();

	const t = $derived(m[lang]);
	const supported = $derived(hasFormConfig(exerciseId));
	/** Standing lifts get a taller portrait crop; lying/seated lifts stay wide. */
	const orientation = $derived(FORM_CONFIGS[exerciseId]?.orientation ?? 'tall');

	let starting = $state(false);
	let running = $state(false);
	let error = $state('');
	/** First-time download of the model + WASM runtime is in progress. */
	let preparing = $state(false);
	/** Download fraction 0..1, or -1 when the total size is unknown (indeterminate). */
	let prepProgress = $state(0);
	let facingMode = $state(/** @type {'environment' | 'user'} */ ('environment'));
	/** Available video inputs (populated once permission is granted). @type {{ deviceId: string, label: string }[]} */
	let cameras = $state(/** @type {{ deviceId: string, label: string }[]} */ ([]));
	/** Explicitly chosen camera; null = use facingMode (front/back) instead. @type {string | null} */
	let selectedDeviceId = $state(/** @type {string | null} */ (null));

	// Live readout
	let reps = $state(0);
	let phase = $state(/** @type {string} */ ('top'));
	let cue = $state(/** @type {import('$lib/js/fitnessI18n').FitnessKey | null} */ (null));
	let cueKind = $state(/** @type {import('$lib/js/poseCoach').CueKind} */ (null));
	let angle = $state(/** @type {number | null} */ (null));
	let faults = $state(/** @type {import('$lib/js/fitnessI18n').FitnessKey[]} */ ([]));

	// Smoothed object-position (%) that pans the cover-cropped feed to keep the
	// person centred. Only takes effect where the feed overflows the panel
	// (i.e. horizontally for a landscape camera) — see coverObjectPosition().
	let objX = $state(50);
	let objY = $state(50);
	const feedPosition = $derived(`${objX}% ${objY}%`);

	/** The single message shown below the video, with a tone ('good' | 'bad' | 'advice' | 'info') for colouring. */
	const advice = $derived.by(() => {
		if (faults.length) return { text: t[faults[0]], kind: 'bad' };
		if (cue) return { text: t[cue], kind: cueKind ?? 'info' };
		return { text: t.coach_cue_get_in_position, kind: 'info' };
	});

	/** @type {HTMLVideoElement | null} */
	let videoEl = $state(null);
	/** @type {HTMLCanvasElement | null} */
	let canvasEl = $state(null);
	/** @type {MediaStream | null} */
	let stream = null;
	/** @type {import('@mediapipe/tasks-vision').PoseLandmarker | null} */
	let landmarker = null;
	/** @type {ExerciseCoach | null} */
	let coach = null;
	let rafId = 0;
	let stopped = false;
	/** Last seen resetKey — a change means the caller advanced the set; recount from zero. */
	let lastResetKey = untrack(() => resetKey);

	function videoConstraints() {
		const base = { width: { ideal: 1280 }, height: { ideal: 720 } };
		// An explicit pick wins; otherwise fall back to a front/back hint (best on mobile).
		return selectedDeviceId
			? { ...base, deviceId: { exact: selectedDeviceId } }
			: { ...base, facingMode };
	}

	/** List video inputs. Labels are only exposed after permission, so call this once a stream is live. */
	async function refreshCameras() {
		if (!navigator.mediaDevices?.enumerateDevices) return;
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			cameras = devices
				.filter((d) => d.kind === 'videoinput')
				.map((d, i) => ({
					deviceId: d.deviceId,
					label: d.label || `${t.coach_camera} ${i + 1}`
				}));
			// Reflect the device actually in use so the selector matches reality (e.g. after a flip).
			const id = stream?.getVideoTracks()[0]?.getSettings().deviceId;
			if (id) selectedDeviceId = id;
		} catch {
			// best-effort — the selector just stays hidden if this fails
		}
	}

	/** Acquire the camera + start the detection loop. Does NOT reset coach/rep state. */
	async function startCamera() {
		stopped = false;
		if (!landmarker) landmarker = await loadPoseLandmarker();
		stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints() });
		await new Promise((r) => requestAnimationFrame(r));
		if (!videoEl || stopped) {
			stop();
			return;
		}
		videoEl.srcObject = stream;
		await videoEl.play();
		running = true;
		starting = false;
		navigator.mediaDevices?.addEventListener?.('devicechange', refreshCameras);
		await refreshCameras();
		loop();
	}

	async function start() {
		error = '';
		if (!globalThis.isSecureContext) {
			error = t.coach_err_https;
			return;
		}
		if (!navigator.mediaDevices?.getUserMedia) {
			error = t.coach_err_no_api;
			return;
		}
		starting = true;
		try {
			coach = new ExerciseCoach(exerciseId);
			reps = 0;
			cue = null;
			if (!landmarker) {
				// Only show the download bar if it's not already cached and the load
				// actually takes a moment — a warm HTTP cache resolves near-instantly.
				prepProgress = 0;
				const showBar = isPoseModelReady() ? null : setTimeout(() => (preparing = true), 250);
				try {
					landmarker = await loadPoseLandmarker((p) => (prepProgress = p));
				} finally {
					if (showBar) clearTimeout(showBar);
					preparing = false;
				}
			}
			await startCamera();
		} catch (e) {
			error =
				e instanceof Error && e.name === 'NotAllowedError'
					? t.coach_err_denied
					: e instanceof Error
						? e.message
						: String(e);
			starting = false;
			stop();
		}
	}

	/** Swap the live camera without ending the session (rep count is preserved). */
	async function switchCamera() {
		stop();
		starting = true;
		try {
			await startCamera();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			starting = false;
			stop();
		}
	}

	function drawOverlay(/** @type {import('$lib/js/poseCoach').Landmark[] | undefined} */ lms) {
		if (!canvasEl || !videoEl) return;
		const w = videoEl.videoWidth;
		const h = videoEl.videoHeight;
		if (canvasEl.width !== w) canvasEl.width = w;
		if (canvasEl.height !== h) canvasEl.height = h;
		const ctx = canvasEl.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, w, h);
		if (!lms) return;

		ctx.lineWidth = Math.max(5, w / 110);
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.strokeStyle = '#5E81AC'; // nord10 blue — bones
		for (const [a, b] of POSE_CONNECTIONS) {
			const pa = lms[a];
			const pb = lms[b];
			if (!pa || !pb) continue;
			ctx.beginPath();
			ctx.moveTo(pa.x * w, pa.y * h);
			ctx.lineTo(pb.x * w, pb.y * h);
			ctx.stroke();
		}
		ctx.fillStyle = '#88C0D0'; // nord8 light blue — joints
		const r = Math.max(5, w / 120);
		for (const p of lms) {
			if ((p.visibility ?? 0) < 0.5) continue;
			ctx.beginPath();
			ctx.arc(p.x * w, p.y * h, r, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	const clamp = (/** @type {number} */ v, /** @type {number} */ lo, /** @type {number} */ hi) =>
		Math.min(hi, Math.max(lo, v));

	/** Torso-weighted centre of the tracked person in normalized [0,1] coords, or null. */
	function personCenter(/** @type {import('$lib/js/poseCoach').Landmark[]} */ lms) {
		// Prefer the torso (shoulders + hips) for a stable centre; fall back to all points.
		const torso = [11, 12, 23, 24].map((i) => lms[i]).filter((p) => p && (p.visibility ?? 0) >= 0.5);
		const pts = torso.length >= 2 ? torso : lms.filter((p) => (p.visibility ?? 0) >= 0.5);
		if (!pts.length) return null;
		let sx = 0;
		let sy = 0;
		for (const p of pts) {
			sx += p.x;
			sy += p.y;
		}
		return { x: sx / pts.length, y: sy / pts.length };
	}

	/**
	 * object-position (%) that places a normalized media point at the panel centre,
	 * given the cover crop. Returns 50 on an axis with no overflow, so a portrait
	 * feed isn't panned horizontally — matching "centre only when horizontal".
	 */
	function coverObjectPosition(/** @type {number} */ px, /** @type {number} */ py) {
		const v = videoEl;
		if (!v) return { tx: 50, ty: 50 };
		const natW = v.videoWidth;
		const natH = v.videoHeight;
		const boxW = v.clientWidth;
		const boxH = v.clientHeight;
		if (!natW || !natH || !boxW || !boxH) return { tx: 50, ty: 50 };
		const s = Math.max(boxW / natW, boxH / natH); // cover scale
		const overflowX = natW * s - boxW;
		const overflowY = natH * s - boxH;
		const tx = overflowX > 1 ? clamp((px * natW * s - boxW / 2) / overflowX, 0, 1) * 100 : 50;
		const ty = overflowY > 1 ? clamp((py * natH * s - boxH / 2) / overflowY, 0, 1) * 100 : 50;
		return { tx, ty };
	}

	function trackPerson(/** @type {import('$lib/js/poseCoach').Landmark[] | undefined} */ lms) {
		const c = lms ? personCenter(lms) : null;
		const target = c ? coverObjectPosition(c.x, c.y) : { tx: 50, ty: 50 };
		// Ease toward the target so the pan stays smooth; recentre slowly when lost.
		const k = c ? 0.12 : 0.05;
		objX += (target.tx - objX) * k;
		objY += (target.ty - objY) * k;
	}

	function loop() {
		if (stopped || !videoEl || !landmarker || !coach) return;
		// New set signalled by the caller → reset the counter without dropping the camera.
		if (resetKey !== lastResetKey) {
			lastResetKey = resetKey;
			coach.reset();
			reps = 0;
			cue = null;
			cueKind = null;
			faults = [];
		}
		const v = videoEl;
		if (v.readyState >= 2) {
			const result = landmarker.detectForVideo(v, performance.now());
			const lms = result.landmarks?.[0];
			drawOverlay(lms);
			trackPerson(lms);
			const update = coach.update(lms);
			phase = update.phase;
			cue = update.cue;
			cueKind = update.cueKind;
			angle = update.angle;
			faults = update.faults;
			if (update.repCompleted) {
				reps = update.reps;
				// Bright tick for a clean rep; descending warning when the rep was sub-par
				// (shallow depth) or a form fault is showing.
				if (update.cueKind === 'good' && !update.faults.length) playSetCompleteSound();
				else playRepWarningSound();
				onrep?.(update.reps);
			}
		}
		// requestVideoFrameCallback paces to the camera cadence when available;
		// rAF is the fallback (same pattern as the barcode scanner).
		if ('requestVideoFrameCallback' in v) {
			rafId = /** @type {any} */ (v).requestVideoFrameCallback(loop);
		} else {
			rafId = requestAnimationFrame(loop);
		}
	}

	function stop() {
		stopped = true;
		running = false;
		if (rafId && videoEl && 'cancelVideoFrameCallback' in videoEl) {
			/** @type {any} */ (videoEl).cancelVideoFrameCallback(rafId);
		} else if (rafId) {
			cancelAnimationFrame(rafId);
		}
		rafId = 0;
		if (stream) {
			for (const track of stream.getTracks()) track.stop();
			stream = null;
		}
		if (videoEl) videoEl.srcObject = null;
		navigator.mediaDevices?.removeEventListener?.('devicechange', refreshCameras);
	}

	async function flipCamera() {
		selectedDeviceId = null; // back to front/back hint mode
		facingMode = facingMode === 'environment' ? 'user' : 'environment';
		await switchCamera();
	}

	function close() {
		stop();
		onclose?.();
	}

	// Enabling the coach (mounting this component) starts the camera straight away.
	onMount(() => {
		if (supported) start();
	});

	onDestroy(() => {
		stop();
		// The landmarker is shared/cached at module scope — drop our reference but
		// don't close it, so re-opening the coach reuses it without re-downloading.
		landmarker = null;
	});
</script>

<div class="pose-coach">
	{#if running}
		<div class="rep-header">
			<span class="rep-count">{reps}</span>
			<span class="rep-label">{t.coach_reps}</span>
		</div>
	{/if}

	<div class="stage" class:tall={orientation === 'tall'}>
		<video bind:this={videoEl} playsinline muted style:object-position={feedPosition}></video>
		<canvas bind:this={canvasEl} class="overlay" style:object-position={feedPosition}></canvas>

		{#if running}
			<div class="meta">
				<span class="phase">{phase}</span>{#if angle != null}<span class="angle"> · {Math.round(angle)}°</span>{/if}
			</div>
		{/if}

		{#if preparing}
			<div class="state-msg">
				<span class="prep-title">{t.coach_downloading}</span>
				<div class="progress" class:indeterminate={prepProgress < 0}>
					<div
						class="progress-bar"
						style:width={prepProgress >= 0 ? `${Math.round(prepProgress * 100)}%` : undefined}
					></div>
				</div>
				<span class="prep-sub">
					{#if prepProgress >= 0}{Math.round(prepProgress * 100)}% · {/if}{t.coach_download_note}
				</span>
			</div>
		{:else if starting}
			<div class="state-msg">
				<LoaderCircle class="spin" size={28} />
				<span>{t.coach_starting}</span>
			</div>
		{/if}
	</div>

	{#if running}
		<!-- Advice lives below the video, never on top of it, and is colour-coded by tone. -->
		<p class="advice" data-kind={advice.kind} role="status" aria-live="polite">{advice.text}</p>
	{/if}

	<div class="controls">
		{#if !supported}
			<p class="note">{t.coach_unsupported}</p>
		{:else if error}
			<p class="error"><CameraOff size={16} /> {error}</p>
			<button class="btn" onclick={start} disabled={starting}>
				{t.coach_try_again}
			</button>
		{/if}

		{#if supported && running}
			{#if cameras.length > 1}
				<select
					class="cam-select"
					bind:value={selectedDeviceId}
					onchange={switchCamera}
					aria-label={t.coach_select_camera}
				>
					{#each cameras as cam (cam.deviceId)}
						<option value={cam.deviceId}>{cam.label}</option>
					{/each}
				</select>
			{/if}
			<button class="btn" onclick={flipCamera} aria-label={t.coach_flip_camera}>
				<RefreshCw size={18} />
				<span>{t.coach_flip}</span>
			</button>
		{/if}

		{#if onclose}
			<button class="btn icon" onclick={close} aria-label={t.coach_close}>
				<X size={18} />
			</button>
		{/if}
	</div>
</div>

<style>
	.pose-coach {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		width: 100%;
	}
	.stage {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-card);
		overflow: hidden;
	}
	/* Standing exercises: taller portrait crop so the whole body fits. Capped width
	   keeps it a sensible card even when the column is wide. */
	.stage.tall {
		aspect-ratio: 3 / 4;
		max-width: 24rem;
		margin-inline: auto;
	}
	video,
	.overlay {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.overlay {
		pointer-events: none;
	}
	/* Rep counter — at the top of the card, above the video. Big enough to read
	   from across the room. */
	.rep-header {
		display: flex;
		align-items: baseline;
		justify-content: center;
		gap: 0.5rem;
	}
	.rep-count {
		font-size: clamp(3rem, 14vw, 5rem);
		font-weight: 800;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary);
	}
	.rep-label {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	/* Phase + angle are debug detail — kept small in the corner. */
	.meta {
		position: absolute;
		top: 0.6rem;
		right: 0.75rem;
		color: #eceff4;
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.85);
		font-size: var(--text-sm);
		text-transform: capitalize;
		font-variant-numeric: tabular-nums;
		pointer-events: none;
	}
	/* Coaching message — sits below the video, colour-coded by tone, sized to read
	   from across the room. */
	.advice {
		margin: 0;
		padding: clamp(0.6rem, 2.5vw, 1.1rem) 1.1rem;
		text-align: center;
		font-size: clamp(1.3rem, 5.5vw, 2.6rem);
		font-weight: 800;
		line-height: 1.1;
		letter-spacing: -0.01em;
		border-radius: var(--radius-md);
		background: color-mix(in srgb, var(--advice-tint) 14%, var(--color-surface));
		color: var(--advice-text);
	}
	.advice[data-kind='good'] {
		--advice-tint: var(--green);
		--advice-text: var(--green);
	}
	.advice[data-kind='bad'] {
		--advice-tint: var(--red);
		--advice-text: var(--red);
	}
	.advice[data-kind='advice'] {
		--advice-tint: var(--orange);
		--advice-text: var(--orange);
	}
	.advice[data-kind='info'] {
		--advice-tint: var(--color-text-tertiary);
		--advice-text: var(--color-text-secondary);
	}
	.state-msg {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		color: var(--color-text-secondary);
	}
	.prep-title {
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.prep-sub {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		font-variant-numeric: tabular-nums;
	}
	.progress {
		width: min(80%, 16rem);
		height: 8px;
		border-radius: var(--radius-pill);
		background: var(--color-bg-elevated);
		overflow: hidden;
	}
	.progress-bar {
		height: 100%;
		border-radius: inherit;
		background: var(--color-primary);
		transition: width 120ms linear;
	}
	.progress.indeterminate .progress-bar {
		width: 40%;
		animation: prep-slide 1.1s ease-in-out infinite;
	}
	@keyframes prep-slide {
		0% { margin-left: -40%; }
		100% { margin-left: 100%; }
	}
	:global(.state-msg .spin) {
		animation: pose-spin 1s linear infinite;
	}
	@keyframes pose-spin {
		to {
			transform: rotate(360deg);
		}
	}
	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		color: var(--color-text-primary);
		cursor: pointer;
		transition: var(--transition-normal);
	}
	.btn:hover {
		background: var(--color-bg-elevated);
	}
	.btn.icon {
		margin-left: auto;
	}
	.cam-select {
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-primary);
		font: inherit;
		max-width: 12rem;
		cursor: pointer;
	}
	.note {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		margin: 0;
	}
	.error {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--red);
		font-size: var(--text-sm);
		margin: 0;
	}
</style>
