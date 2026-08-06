<script>
	// Dev-only data recorder for the motion-gate classifier (see memory: motion-gate).
	// Captures raw MediaPipe pose frames labelled {rep, walk, idle} and exports them
	// as JSON for the offline training pipeline (scripts/motion-gate/). Unlinked from
	// the app nav; reachable at /fitness/motion-gate by anyone logged in. Not a
	// shipping user feature — no i18n, no e2e spec (camera-driven).
	import { onDestroy } from 'svelte';
	import PoseCoach from '$lib/components/fitness/PoseCoach.svelte';
	import {
		FEATURE_NAMES,
		FEATURE_DIM,
		WINDOW_FRAMES,
		WINDOW_MS
	} from '$lib/js/motionFeatures';
	import { FORM_CONFIGS } from '$lib/js/poseCoach';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import Circle from '@lucide/svelte/icons/circle';
	import Square from '@lucide/svelte/icons/square';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import Download from '@lucide/svelte/icons/download';

	/** @typedef {'rep' | 'walk' | 'idle'} Label */
	/** @typedef {{ t: number, c: 0 | 1, l: number[][] | null }} Frame */
	/** @typedef {{ label: Label, exercise: string | null, startedAt: number, durationMs: number, trimTailMs: number, frames: Frame[] }} Clip */

	const COUNTDOWN_OPTIONS = [0, 3, 5, 10];
	const TRIM_STEP_MS = 500;

	const LABELS = /** @type {Label[]} */ (['rep', 'walk', 'idle']);
	const LABEL_HELP = {
		rep: 'Do clean reps of the selected exercise, in place.',
		walk: 'Walk toward / away from the camera, and side to side — the motion we must reject.',
		idle: 'Stand, shift weight, grab water, adjust the bar — anything that is NOT a rep.'
	};
	const EXERCISE_IDS = Object.keys(FORM_CONFIGS).sort();

	let label = $state(/** @type {Label} */ ('rep'));
	let exercise = $state('squat-barbell');
	let recording = $state(false);
	let liveFrames = $state(0);
	let liveConfident = $state(0);
	let clips = $state(/** @type {Clip[]} */ ([]));

	// Countdown before capture starts, so you can get into position — those frames
	// are NOT recorded. 0 = start immediately.
	let countdownSec = $state(3);
	let counting = $state(false);
	let countLeft = $state(0);
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let countTimer;

	// Non-reactive accumulator: pushed to on every camera frame, so keep it off the
	// reactive graph (only the small counters above drive the UI).
	/** @type {Frame[]} */
	let buffer = [];
	let recStart = $state(0);

	const round4 = (/** @type {number} */ n) => Math.round(n * 1e4) / 1e4;
	const round3 = (/** @type {number} */ n) => Math.round(n * 1e3) / 1e3;

	/** Pack 33 landmarks into rounded [x, y, z, visibility] tuples to shrink the JSON. */
	function compact(/** @type {import('$lib/js/poseCoach').Landmark[]} */ raw) {
		return raw.map((p) => [round4(p.x), round4(p.y), round4(p.z), round3(p.visibility ?? 0)]);
	}

	function onframe(
		/** @type {{ raw: import('$lib/js/poseCoach').Landmark[] | undefined, now: number, confident: boolean }} */ frame
	) {
		if (!recording) return;
		buffer.push({ t: Math.round(frame.now), c: frame.confident ? 1 : 0, l: frame.raw ? compact(frame.raw) : null });
		liveFrames = buffer.length;
		if (frame.confident) liveConfident++;
	}

	function startRecord() {
		buffer = [];
		liveFrames = 0;
		liveConfident = 0;
		recStart = performance.now();
		recording = true;
	}

	function stopRecord() {
		recording = false;
		if (buffer.length) {
			clips = [
				...clips,
				{
					label,
					exercise: label === 'rep' ? exercise : null,
					startedAt: Date.now(),
					durationMs: Math.round(performance.now() - recStart),
					trimTailMs: 0,
					frames: buffer
				}
			];
		}
		buffer = [];
	}

	function tickCountdown() {
		countTimer = setTimeout(() => {
			countLeft -= 1;
			if (countLeft <= 0) {
				counting = false;
				startRecord();
			} else {
				tickCountdown();
			}
		}, 1000);
	}

	function beginRecord() {
		if (countdownSec <= 0) {
			startRecord();
			return;
		}
		counting = true;
		countLeft = countdownSec;
		tickCountdown();
	}

	function cancelCountdown() {
		clearTimeout(countTimer);
		counting = false;
		countLeft = 0;
	}

	function toggleRecord() {
		if (recording) stopRecord();
		else if (counting) cancelCountdown();
		else beginRecord();
	}

	onDestroy(() => clearTimeout(countTimer));

	function deleteClip(/** @type {number} */ i) {
		clips = clips.filter((_, j) => j !== i);
	}

	/** Effective (post-trim) duration of a clip, in ms. */
	function effMs(/** @type {Clip} */ c) {
		return Math.max(0, c.durationMs - c.trimTailMs);
	}

	/** Adjust how much is cut off the end of clip `i` (non-destructive; clamped). */
	function trimClip(/** @type {number} */ i, /** @type {number} */ deltaMs) {
		clips = clips.map((c, j) =>
			j === i ? { ...c, trimTailMs: Math.min(c.durationMs, Math.max(0, c.trimTailMs + deltaMs)) } : c
		);
	}

	/** Frames kept after trimming the tail: those at or before (lastFrameTime − trim). */
	function keptFrames(/** @type {Clip} */ c) {
		if (c.trimTailMs <= 0 || !c.frames.length) return c.frames;
		const cutoff = c.frames[c.frames.length - 1].t - c.trimTailMs;
		return c.frames.filter((f) => f.t <= cutoff);
	}

	async function clearAll() {
		if (!clips.length) return;
		if (await confirm(`Discard all ${clips.length} recorded clips?`, { destructive: true, confirmText: 'Discard', cancelText: 'Keep' }))
			clips = [];
	}

	function exportJson() {
		// Apply each clip's tail trim and drop the editor-only trimTailMs field.
		const outClips = clips.map((c) => ({
			label: c.label,
			exercise: c.exercise,
			startedAt: c.startedAt,
			durationMs: effMs(c),
			frames: keptFrames(c)
		}));
		const doc = {
			version: 1,
			spec: {
				featureNames: FEATURE_NAMES,
				dim: FEATURE_DIM,
				windowFrames: WINDOW_FRAMES,
				windowMs: WINDOW_MS
			},
			createdAt: Date.now(),
			clips: outClips
		};
		const blob = new Blob([JSON.stringify(doc)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `motion-gate-${clips.length}clips-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// Per-label clip + second totals, so you can see the dataset balance while collecting.
	const totals = $derived.by(() => {
		const by = /** @type {Record<Label, { clips: number, seconds: number }>} */ ({
			rep: { clips: 0, seconds: 0 },
			walk: { clips: 0, seconds: 0 },
			idle: { clips: 0, seconds: 0 }
		});
		for (const c of clips) {
			by[c.label].clips++;
			by[c.label].seconds += effMs(c) / 1000;
		}
		return by;
	});

	const fmtSecs = (/** @type {number} */ s) => `${s.toFixed(1)}s`;
</script>

<svelte:head><title>Motion-gate recorder</title></svelte:head>

<div class="recorder">
	<header class="head">
		<h1>Motion-gate recorder</h1>
		<p class="sub">
			Record labelled pose clips for the {WINDOW_FRAMES}×{FEATURE_DIM} motion classifier.
			Balance the three labels, then export the JSON for training.
		</p>
	</header>

	<div class="camera" class:recording>
		<PoseCoach exerciseId="squat-barbell" variant="panel" paused={true} {onframe} />
		{#if recording}
			<div class="rec-badge" aria-live="polite">
				<span class="dot"></span>
				REC · {label} · {liveFrames}f · {liveFrames ? Math.round((liveConfident / liveFrames) * 100) : 0}% tracked
			</div>
		{:else if counting}
			<div class="countdown" aria-live="assertive">
				<span class="count-num">{countLeft}</span>
				<span class="count-sub">get into position…</span>
			</div>
		{/if}
	</div>

	<div class="label-picker" role="group" aria-label="Clip label">
		{#each LABELS as l (l)}
			<button
				type="button"
				class="label-btn"
				class:active={label === l}
				disabled={recording || counting}
				onclick={() => (label = l)}
			>
				{l}
			</button>
		{/each}
	</div>
	<p class="label-help">{LABEL_HELP[label]}</p>

	<label class="countdown-row">
		<span>Countdown before capture</span>
		<select bind:value={countdownSec} disabled={recording || counting}>
			{#each COUNTDOWN_OPTIONS as s (s)}
				<option value={s}>{s === 0 ? 'none' : `${s}s`}</option>
			{/each}
		</select>
	</label>

	{#if label === 'rep'}
		<label class="exercise-row">
			<span>Exercise (metadata)</span>
			<select bind:value={exercise} disabled={recording || counting}>
				{#each EXERCISE_IDS as id (id)}
					<option value={id}>{id}</option>
				{/each}
			</select>
		</label>
	{/if}

	<button type="button" class="record-btn" class:recording class:counting onclick={toggleRecord}>
		{#if recording}
			<Square size={20} fill="currentColor" /> Stop ({fmtSecs((liveFrames && (performance.now() - recStart)) / 1000 || 0)})
		{:else if counting}
			<Square size={20} fill="currentColor" /> Cancel ({countLeft})
		{:else}
			<Circle size={20} fill="currentColor" /> Record {label}
		{/if}
	</button>

	<section class="dataset">
		<div class="totals">
			{#each LABELS as l (l)}
				<div class="total" data-label={l}>
					<span class="total-label">{l}</span>
					<span class="total-val">{totals[l].clips} clips · {fmtSecs(totals[l].seconds)}</span>
				</div>
			{/each}
		</div>

		{#if clips.length}
			<ul class="clip-list">
				{#each clips as clip, i (i)}
					<li class="clip">
						<span class="clip-tag" data-label={clip.label}>{clip.label}</span>
						<span class="clip-meta">
							{clip.exercise ?? '—'} · {fmtSecs(effMs(clip) / 1000)}{#if clip.trimTailMs > 0}<span class="clip-trimmed"> (−{fmtSecs(clip.trimTailMs / 1000)})</span>{/if}
						</span>
						<div class="clip-trim" role="group" aria-label="Trim tail">
							<button
								type="button"
								onclick={() => trimClip(i, -TRIM_STEP_MS)}
								disabled={clip.trimTailMs <= 0}
								aria-label="Restore 0.5s"
							>−</button>
							<span class="clip-trim-label">cut end</span>
							<button
								type="button"
								onclick={() => trimClip(i, TRIM_STEP_MS)}
								disabled={effMs(clip) <= 0}
								aria-label="Trim 0.5s off end"
							>+</button>
						</div>
						<button type="button" class="clip-del" onclick={() => deleteClip(i)} aria-label="Delete clip">
							<Trash2 size={16} />
						</button>
					</li>
				{/each}
			</ul>

			<div class="dataset-actions">
				<button type="button" class="btn ghost" onclick={clearAll}>Clear all</button>
				<button type="button" class="btn primary" onclick={exportJson}>
					<Download size={16} /> Export {clips.length} clips
				</button>
			</div>
		{:else}
			<p class="empty">No clips yet — pick a label and hit record.</p>
		{/if}
	</section>
</div>

<style>
	.recorder {
		max-width: 640px;
		margin-inline: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.head h1 {
		margin: 0;
		font-size: var(--text-2xl, 1.6rem);
		color: var(--color-text-primary);
	}
	.sub {
		margin: 0.25rem 0 0;
		color: var(--color-text-secondary);
		font-size: var(--text-sm, 0.85rem);
	}
	.camera {
		position: relative;
		border-radius: var(--radius-card, 20px);
		overflow: hidden;
		border: 2px solid var(--color-border);
		transition: border-color var(--transition-normal, 200ms);
	}
	.camera.recording {
		border-color: var(--red);
	}
	.rec-badge {
		position: absolute;
		top: 0.6rem;
		left: 0.6rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.3rem 0.6rem;
		border-radius: var(--radius-pill, 1000px);
		background: color-mix(in srgb, var(--red) 88%, black);
		color: white;
		font-size: 0.75rem;
		font-weight: 700;
		letter-spacing: 0.02em;
	}
	.rec-badge .dot {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: white;
		animation: blink 1s steps(2, start) infinite;
	}
	@keyframes blink {
		to {
			opacity: 0;
		}
	}
	.label-picker {
		display: flex;
		gap: 0.5rem;
	}
	.label-btn {
		flex: 1;
		padding: 0.6rem;
		border: 1.5px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		border-radius: var(--radius-md, 0.5rem);
		font-weight: 700;
		text-transform: capitalize;
		cursor: pointer;
		transition: all var(--transition-fast, 100ms);
	}
	.label-btn.active {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}
	.label-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.label-help {
		margin: 0;
		color: var(--color-text-tertiary);
		font-size: var(--text-sm, 0.85rem);
	}
	.exercise-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		color: var(--color-text-secondary);
		font-size: var(--text-sm, 0.85rem);
	}
	.exercise-row select {
		flex: 1;
		max-width: 60%;
		padding: 0.5rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--color-text-primary);
	}
	.record-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.85rem;
		border: none;
		border-radius: var(--radius-lg, 0.75rem);
		background: var(--red);
		color: white;
		font-size: 1rem;
		font-weight: 700;
		cursor: pointer;
		transition: transform var(--transition-fast, 100ms), background var(--transition-normal, 200ms);
	}
	.record-btn:active {
		transform: scale(0.98);
	}
	.record-btn.recording {
		background: var(--color-text-tertiary);
	}
	.dataset {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.totals {
		display: flex;
		gap: 0.5rem;
	}
	.total {
		flex: 1;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius-md, 0.5rem);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.total-label {
		font-weight: 700;
		text-transform: capitalize;
		color: var(--color-text-secondary);
		font-size: var(--text-sm, 0.8rem);
	}
	.total-val {
		color: var(--color-text-tertiary);
		font-size: 0.75rem;
	}
	.clip-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		max-height: 260px;
		overflow-y: auto;
	}
	.clip {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.6rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
	}
	.clip-tag,
	.total[data-label='rep'] .total-label {
		color: inherit;
	}
	.clip-tag {
		font-weight: 700;
		text-transform: capitalize;
		padding: 0.15rem 0.5rem;
		border-radius: var(--radius-sm, 0.3rem);
		font-size: 0.75rem;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}
	.clip-tag[data-label='rep'] {
		background: color-mix(in srgb, var(--green) 20%, transparent);
		color: var(--green);
	}
	.clip-tag[data-label='walk'] {
		background: color-mix(in srgb, var(--orange) 20%, transparent);
		color: var(--orange);
	}
	.clip-tag[data-label='idle'] {
		background: color-mix(in srgb, var(--blue) 20%, transparent);
		color: var(--blue);
	}
	.clip-meta {
		flex: 1;
		color: var(--color-text-tertiary);
		font-size: 0.8rem;
	}
	.clip-del {
		background: none;
		border: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		padding: 0.2rem;
		display: flex;
	}
	.clip-del:hover {
		color: var(--red);
	}
	.dataset-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 0.9rem;
		border-radius: var(--radius-md, 0.5rem);
		font-weight: 600;
		cursor: pointer;
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}
	.btn.primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		border-color: var(--color-primary);
	}
	.btn.ghost:hover {
		color: var(--red);
	}
	.empty {
		color: var(--color-text-tertiary);
		font-size: var(--text-sm, 0.85rem);
		text-align: center;
		padding: 1rem;
	}

	/* Countdown overlay over the feed */
	.countdown {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		background: color-mix(in srgb, black 45%, transparent);
		color: white;
	}
	.count-num {
		font-size: clamp(3rem, 18vw, 6rem);
		font-weight: 800;
		line-height: 1;
		animation: pop 1s ease-out infinite;
	}
	.count-sub {
		font-size: var(--text-sm, 0.85rem);
		opacity: 0.9;
	}
	@keyframes pop {
		0% {
			transform: scale(0.7);
			opacity: 0.4;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}
	.record-btn.counting {
		background: var(--orange);
	}
	.countdown-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		color: var(--color-text-secondary);
		font-size: var(--text-sm, 0.85rem);
	}
	.countdown-row select {
		padding: 0.5rem;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--color-text-primary);
	}
	.clip-trimmed {
		color: var(--orange);
	}
	.clip-trim {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-shrink: 0;
	}
	.clip-trim button {
		width: 1.6rem;
		height: 1.6rem;
		border-radius: var(--radius-sm, 0.3rem);
		border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
	}
	.clip-trim button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.clip-trim-label {
		font-size: 0.7rem;
		color: var(--color-text-tertiary);
	}
</style>
