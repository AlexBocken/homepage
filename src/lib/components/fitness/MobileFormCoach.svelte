<script>
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Pause from '@lucide/svelte/icons/pause';
	import Play from '@lucide/svelte/icons/play';
	import Check from '@lucide/svelte/icons/check';
	import SkipForward from '@lucide/svelte/icons/skip-forward';
	import SwitchCamera from '@lucide/svelte/icons/switch-camera';
	import Info from '@lucide/svelte/icons/info';

	/**
	 * Full-screen mobile HUD for the live form coach. The camera feed is the
	 * background (passed in via the `children` snippet); telemetry is overlaid.
	 *
	 * Two phases:
	 *  - `lifting`  — giant rep count, form feedback, set telemetry, a "Done set"
	 *                 button to finish the working set.
	 *  - `resting`  — form is irrelevant, so a big rest countdown takes over the
	 *                 video, previewing the next set. Auto-advances at 0:00.
	 *
	 * Presentational only — set data + phase come from props so this can later be
	 * driven by the real PoseCoach + active-workout state.
	 *
	 * `mode` picks the active-phase view:
	 *  - `reps` — weight × reps @ RPE, with the giant rep counter.
	 *  - `hold` — timed exercises (planks, stretches: `metrics: ['duration']`).
	 *    A wall-clock hold countdown replaces the rep counter; at 0:00 the owner
	 *    auto-completes the set and starts rest (matching the store's hold timer).
	 *    Hold values are in SECONDS here; the store persists minutes.
	 *
	 * @type {{
	 *   phase?: 'lifting' | 'resting',
	 *   mode?: 'reps' | 'hold',
	 *   exerciseName: string,
	 *   setNumber: number,
	 *   totalSets: number,
	 *   targetReps?: number,
	 *   weight?: number,
	 *   rpe?: number,
	 *   last?: { weight: number, reps: number, rpe: number } | null,
	 *   repCount?: number,
	 *   holdTarget?: number,
	 *   holdSeconds?: number,
	 *   holdTotal?: number,
	 *   holdActive?: boolean,
	 *   lastSeconds?: number | null,
	 *   feedback?: { text: string, kind: 'good' | 'bad' | 'advice' | 'info' },
	 *   restSeconds?: number,
	 *   restTotal?: number,
	 *   next?: {
	 *     exerciseName: string, setNumber: number, totalSets: number,
	 *     weight?: number, targetReps?: number, rpe?: number, holdTarget?: number | null
	 *   } | null,
	 *   editable?: boolean,
	 *   privacyText?: string,
	 *   privacyAria?: string,
	 *   onField?: (field: 'weight' | 'reps' | 'rpe' | 'duration', value: number | null) => void,
	 *   onFlipCamera?: () => void,
	 *   onback?: () => void,
	 *   oncompleteSet?: () => void,
	 *   onnextSet?: () => void,
	 *   onRestAdjust?: (delta: number) => void,
	 *   onStartHold?: () => void,
	 *   onHoldSkip?: () => void,
	 *   children?: import('svelte').Snippet,
	 * }}
	 *
	 * When `editable`, the deck shows live number inputs for the current set;
	 * each edit emits `onField(field, value)` (duration in SECONDS — the owner
	 * converts to the store's minutes).
	 *
	 * The rest + hold timers are prop-driven — `restSeconds`/`restTotal` mirror the
	 * store's `restTimerSeconds`/`restTimerTotal` (`onRestAdjust(±30)` → `adjustRestTimer`),
	 * and `holdSeconds`/`holdTotal` mirror its hold timer. The owner counts down (a
	 * wall-clock in the real store); this component only renders + emits intent.
	 */
	let {
		phase = 'lifting',
		mode = 'reps',
		exerciseName,
		setNumber,
		totalSets,
		targetReps,
		weight,
		rpe,
		last = null,
		repCount = 0,
		holdTarget = 0,
		holdSeconds = 0,
		holdTotal = 0,
		holdActive = false,
		lastSeconds = null,
		feedback = { text: '', kind: 'info' },
		restSeconds = 0,
		restTotal = 0,
		next = null,
		editable = false,
		privacyText = 'All analysis runs on your device. Your camera feed is never uploaded or shared with the server.',
		privacyAria = 'About form coach privacy',
		onField,
		onFlipCamera,
		onback,
		oncompleteSet,
		onnextSet,
		onRestAdjust,
		onStartHold,
		onHoldSkip,
		children
	} = $props();

	const fmt = (/** @type {number} */ s) =>
		`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

	/** Parse a number input → value (or null when cleared) and emit it. */
	function emitField(/** @type {'weight' | 'reps' | 'rpe' | 'duration'} */ field, /** @type {Event} */ e) {
		const raw = /** @type {HTMLInputElement} */ (e.currentTarget).value;
		onField?.(field, raw === '' ? null : Number(raw));
	}

	// Privacy/beta info tooltip (mirrors the desktop coach header).
	let showInfo = $state(false);

	// Set stopwatch — counts up while lifting, with pause/continue.
	let paused = $state(false);
	let setElapsed = $state(0);
	$effect(() => {
		// Reset (and unpause) the working-set clock whenever a new set begins.
		if (phase === 'lifting') {
			setElapsed = 0;
			paused = false;
		}
	});
	$effect(() => {
		if (phase !== 'lifting' || mode !== 'reps' || paused) return;
		const id = setInterval(() => (setElapsed += 1), 1000);
		return () => clearInterval(id);
	});
	const setLabel = $derived(fmt(setElapsed));

	// Rest + hold timers are owned by the caller (store wall-clock); we render them.
	const restLabel = $derived(fmt(restSeconds));
	const restProgress = $derived(restTotal > 0 ? restSeconds / restTotal : 0);
	const restLow = $derived(phase === 'resting' && restSeconds <= 10);

	const holdLabel = $derived(fmt(holdActive ? holdSeconds : holdTarget));
	const holdProgress = $derived(holdTotal > 0 ? holdSeconds / holdTotal : 1);
	const holdLow = $derived(holdActive && holdSeconds <= 10);

	// Pop the rep numeral briefly each time the count climbs.
	let popping = $state(false);
	let prevReps = $state(NaN);
	$effect(() => {
		if (repCount === prevReps) return;
		const grew = repCount > prevReps;
		prevReps = repCount;
		if (!grew) return;
		popping = true;
		const id = setTimeout(() => (popping = false), 260);
		return () => clearTimeout(id);
	});
</script>

<section class="hud" class:resting={phase === 'resting'}>
	<div class="bg">
		{@render children?.()}
	</div>
	<div class="scrim scrim-top" aria-hidden="true"></div>
	<div class="scrim scrim-bottom" aria-hidden="true"></div>

	<!-- Top bar: exit + status -->
	<header class="topbar">
		<div class="top-left">
			<button class="back" onclick={() => onback?.()} aria-label="Back to workout">
				<ArrowLeft size={22} strokeWidth={2.5} />
			</button>
			<span class="beta-badge">BETA</span>
			<button
				class="info-btn"
				onclick={() => (showInfo = !showInfo)}
				aria-label={privacyAria}
				aria-expanded={showInfo}
			>
				<Info size={16} />
			</button>
			{#if showInfo}
				<div class="info-tip" role="status">{privacyText}</div>
			{/if}
		</div>
		<div class="top-right">
			{#if phase === 'lifting'}
				<div class="status">
					{#if mode === 'reps'}<span class="rec" aria-hidden="true"></span>{/if}
					<span class="set-tag"><b>SET</b>{setNumber}<i>/</i>{totalSets}</span>
				</div>
			{:else}
				<span class="set-tag muted"><b>RESTING</b></span>
			{/if}
			{#if onFlipCamera}
				<button class="back" onclick={() => onFlipCamera?.()} aria-label="Switch camera">
					<SwitchCamera size={20} strokeWidth={2.2} />
				</button>
			{/if}
		</div>
	</header>

	{#if phase === 'resting'}
		<!-- Rest takeover: big countdown + linear decay bar + next-set preview.
		     Mirrors RestTimer's `−30 · skip · +30` grammar, scaled up. -->
		<div class="rest">
			<div class="rest-main">
				<span class="big-eyebrow">REST</span>
				<button class="rest-clock-btn" onclick={() => onnextSet?.()} aria-label="Skip rest">
					<span class="rest-clock" class:low={restLow}>{restLabel}</span>
				</button>

				<div class="decay" class:low={restLow}>
					<div class="decay-fill" style:width="{restProgress * 100}%"></div>
				</div>

				<div class="adjust-row">
					<button class="adjust" onclick={() => onRestAdjust?.(-30)} aria-label="Subtract 30 seconds">
						−30s
					</button>
					<span class="adjust-hint">tap time to skip</span>
					<button class="adjust" onclick={() => onRestAdjust?.(30)} aria-label="Add 30 seconds">
						+30s
					</button>
				</div>
			</div>

			<div class="rest-foot">
				{#if next}
					<div class="next-card">
						<span class="deck-label">NEXT · SET {next.setNumber}/{next.totalSets}</span>
						<p class="next-name">{next.exerciseName}</p>
						{#if next.holdTarget != null}
							<p class="prescription">
								<span class="num">{fmt(next.holdTarget)}</span><span class="unit">hold</span>
							</p>
						{:else}
							<p class="prescription">
								<span class="num">{next.weight}</span><span class="unit">kg</span>
								<span class="mul">×</span>
								<span class="num">{next.targetReps}</span>
								<span class="rpe">@{next.rpe}</span>
							</p>
						{/if}
					</div>
				{:else}
					<div class="next-card">
						<span class="deck-label">WORKOUT COMPLETE</span>
						<p class="next-name">Nice work — that was the last set.</p>
					</div>
				{/if}
				<button class="primary skip" onclick={() => onnextSet?.()}>
					<SkipForward size={18} strokeWidth={2.5} fill="currentColor" />
					{next ? 'Start next set' : 'Finish'}
				</button>
			</div>
		</div>
	{:else if mode === 'hold'}
		<!-- Hold view: timed exercises (planks, stretches). The countdown replaces
		     the rep counter; the same decay bar as rest tracks holdSeconds/holdTotal. -->
		<div class="readout">
			<div class="hold">
				<span class="big-eyebrow">HOLD</span>
				{#if holdActive}
					<button class="rest-clock-btn" onclick={() => onHoldSkip?.()} aria-label="Finish hold">
						<span class="rest-clock" class:low={holdLow}>{holdLabel}</span>
					</button>
					<div class="decay" class:low={holdLow}>
						<div class="decay-fill" style:width="{holdProgress * 100}%"></div>
					</div>
				{:else}
					<span class="rest-clock">{holdLabel}</span>
					<span class="hold-note">target hold</span>
				{/if}
			</div>

			{#if feedback.text}
				<p class="feedback" data-kind={feedback.kind} role="status" aria-live="polite">
					{feedback.text}
				</p>
			{/if}
		</div>

		<footer class="deck">
			<div class="hairline" aria-hidden="true"></div>
			<div class="lift">
				<span class="deck-label">LIFT</span>
				<h1 class="lift-name">{exerciseName}</h1>
			</div>

			<div class="grid">
				<div class="datum">
					<span class="deck-label">TARGET</span>
					{#if editable && !holdActive}
						<span class="field-inp">
							<input
								type="number"
								inputmode="numeric"
								value={holdTarget || ''}
								placeholder="0"
								oninput={(e) => emitField('duration', e)}
							/><i>sec</i>
						</span>
					{:else}
						<p class="prescription">
							<span class="num">{fmt(holdTarget)}</span><span class="unit">hold</span>
						</p>
					{/if}
				</div>
				<div class="datum last" class:empty={lastSeconds == null}>
					<span class="deck-label">LAST</span>
					<p class="prescription ghost">
						{#if lastSeconds != null}
							<span class="num">{fmt(lastSeconds)}</span><span class="unit">hold</span>
						{:else}
							—
						{/if}
					</p>
				</div>
			</div>

			{#if holdActive}
				<button class="primary skip" onclick={() => onHoldSkip?.()}>
					<Check size={19} strokeWidth={3} /> Finish hold
				</button>
			{:else}
				<button class="primary done" onclick={() => onStartHold?.()}>
					<Play size={18} strokeWidth={2.5} fill="currentColor" /> Start hold
				</button>
			{/if}
		</footer>
	{:else}
		<!-- Center readout: giant rep count + form feedback. -->
		<div class="readout">
			<div class="reps" class:pop={popping}>
				<span class="rep-now">{repCount}</span>
				<span class="big-eyebrow">REPS</span>
			</div>

			<p class="feedback" data-kind={feedback.kind} role="status" aria-live="polite">
				{feedback.text}
			</p>
		</div>

		<!-- Telemetry deck + complete-set action. -->
		<footer class="deck">
			<div class="hairline" aria-hidden="true"></div>
			<div class="lift">
				<span class="deck-label">LIFT</span>
				<h1 class="lift-name">{exerciseName}</h1>
			</div>

			{#if editable}
				<div class="log-grid">
					<label class="field">
						<span class="deck-label">WEIGHT</span>
						<span class="field-inp">
							<input
								type="number"
								inputmode="decimal"
								value={weight ?? ''}
								placeholder="0"
								oninput={(e) => emitField('weight', e)}
							/><i>kg</i>
						</span>
					</label>
					<label class="field">
						<span class="deck-label">REPS</span>
						<span class="field-inp">
							<input
								type="number"
								inputmode="numeric"
								value={repCount || ''}
								placeholder="0"
								oninput={(e) => emitField('reps', e)}
							/>
						</span>
					</label>
					<label class="field">
						<span class="deck-label">RPE</span>
						<span class="field-inp">
							<input
								type="number"
								inputmode="numeric"
								min="1"
								max="10"
								value={rpe ?? ''}
								placeholder="—"
								oninput={(e) => emitField('rpe', e)}
							/>
						</span>
					</label>
				</div>
				{#if last}
					<p class="last-line">
						<span class="deck-label">LAST</span>
						{last.weight} kg × {last.reps} <span class="rpe">@{last.rpe}</span>
					</p>
				{/if}
			{:else}
				<div class="grid">
					<div class="datum">
						<span class="deck-label">TARGET</span>
						<p class="prescription">
							<span class="num">{weight}</span><span class="unit">kg</span>
							<span class="mul">×</span>
							<span class="num">{targetReps}</span>
							<span class="rpe">@{rpe}</span>
						</p>
					</div>

					<div class="datum last" class:empty={!last}>
						<span class="deck-label">LAST</span>
						{#if last}
							<p class="prescription ghost">
								<span class="num">{last.weight}</span><span class="unit">kg</span>
								<span class="mul">×</span>
								<span class="num">{last.reps}</span>
								<span class="rpe">@{last.rpe}</span>
							</p>
						{:else}
							<p class="prescription ghost">—</p>
						{/if}
					</div>

					<div class="datum timer">
						<span class="deck-label">SET TIME</span>
						<div class="timer-row">
							<span class="clock">{setLabel}</span>
							<button
								class="pause"
								onclick={() => (paused = !paused)}
								aria-label={paused ? 'Resume timer' : 'Pause timer'}
								aria-pressed={paused}
							>
								{#if paused}
									<Play size={16} strokeWidth={2.5} fill="currentColor" />
								{:else}
									<Pause size={16} strokeWidth={2.5} fill="currentColor" />
								{/if}
							</button>
						</div>
					</div>
				</div>
			{/if}

			<button class="primary done" onclick={() => oncompleteSet?.()}>
				<Check size={19} strokeWidth={3} /> Done set
			</button>
		</footer>
	{/if}
</section>

<style>
	.hud {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		background: #11141a;
		color: #eceff4;
		/* Telemetry micro-labels + figures lean on a mono stack; the rest uses the
		   site sans. */
		--mono: ui-monospace, 'SF Mono', 'JetBrains Mono', 'Menlo', monospace;
		--frost: #88c0d0;
	}

	/* --- background video --- */
	.bg {
		position: absolute;
		inset: 0;
	}
	.bg :global(video),
	.bg :global(canvas),
	.bg :global(img) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.bg::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(120% 80% at 70% 0%, #3b4252 0%, transparent 55%),
			linear-gradient(160deg, #2e3440 0%, #191c23 100%);
		z-index: -1;
	}

	.scrim {
		position: absolute;
		inset-inline: 0;
		pointer-events: none;
		transition: opacity 250ms ease;
	}
	.scrim-top {
		top: 0;
		height: 38%;
		background: linear-gradient(to bottom, rgba(20, 24, 31, 0.78), transparent);
	}
	.scrim-bottom {
		bottom: 0;
		height: 58%;
		background: linear-gradient(to top, rgba(17, 20, 26, 0.92) 18%, transparent);
	}
	/* During rest the feed is just ambience — darken it so the clock reads. */
	.hud.resting .scrim-top {
		height: 100%;
		background: linear-gradient(to bottom, rgba(17, 20, 26, 0.82), rgba(17, 20, 26, 0.62));
	}

	/* --- top bar --- */
	.topbar {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: calc(env(safe-area-inset-top, 0px) + 0.9rem) 1.1rem 0;
	}
	.back {
		display: grid;
		place-items: center;
		width: 2.75rem;
		height: 2.75rem;
		border-radius: 50%;
		border: 1px solid rgba(236, 239, 244, 0.18);
		background: rgba(30, 34, 42, 0.5);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		color: #eceff4;
		cursor: pointer;
		transition:
			background 150ms ease,
			scale 150ms ease;
	}
	.back:hover {
		background: rgba(46, 52, 64, 0.7);
	}
	.back:active {
		scale: 0.92;
	}
	.top-left {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.beta-badge {
		font-family: var(--mono);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		padding: 0.15rem 0.45rem;
		border-radius: var(--radius-pill, 1000px);
		background: color-mix(in srgb, var(--frost) 24%, transparent);
		color: var(--frost);
		text-shadow: 0 1px 6px rgba(0, 0, 0, 0.6);
	}
	.info-btn {
		display: grid;
		place-items: center;
		width: 1.9rem;
		height: 1.9rem;
		padding: 0;
		border: none;
		border-radius: 50%;
		background: none;
		color: #eceff4;
		opacity: 0.7;
		cursor: pointer;
		transition: opacity 150ms ease;
	}
	.info-btn:hover {
		opacity: 1;
	}
	.info-tip {
		position: absolute;
		top: 100%;
		left: 0;
		margin-top: 0.5rem;
		z-index: 20;
		width: max-content;
		max-width: 15rem;
		padding: 0.6rem 0.75rem;
		border-radius: var(--radius-md, 0.5rem);
		border: 1px solid rgba(236, 239, 244, 0.18);
		background: rgba(30, 34, 42, 0.92);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: var(--shadow-md, 0 4px 24px rgba(0, 0, 0, 0.4));
		font-size: 0.74rem;
		font-weight: 400;
		line-height: 1.5;
		color: #d8dee9;
	}
	.top-right {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.status {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.rec {
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		background: var(--frost);
		box-shadow: 0 0 0.7rem var(--frost);
		animation: pulse 1.6s ease-in-out infinite;
	}
	.set-tag {
		font-family: var(--mono);
		font-size: 0.95rem;
		letter-spacing: 0.04em;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 1px 8px rgba(0, 0, 0, 0.6);
	}
	.set-tag b {
		font-weight: 700;
		letter-spacing: 0.18em;
		margin-right: 0.45rem;
		color: var(--frost);
	}
	.set-tag i {
		font-style: normal;
		opacity: 0.5;
		margin-inline: 0.1rem;
	}
	.set-tag.muted b {
		color: rgba(216, 222, 233, 0.7);
		margin-right: 0;
	}

	/* --- shared eyebrow above a giant figure --- */
	.big-eyebrow {
		font-family: var(--mono);
		font-size: 0.85rem;
		font-weight: 700;
		letter-spacing: 0.5em;
		text-indent: 0.5em;
		color: var(--frost);
		text-shadow: 0 1px 10px rgba(0, 0, 0, 0.7);
	}

	/* --- center readout (lifting) --- */
	.readout {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: clamp(1rem, 5vh, 2.4rem);
		padding: 1rem;
		min-height: 0;
	}
	.reps {
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
		gap: 0.6rem;
		line-height: 0.82;
		transition: scale 180ms cubic-bezier(0.2, 1.4, 0.4, 1);
	}
	.reps.pop {
		scale: 1.07;
	}
	.rep-now {
		font-size: clamp(7rem, 40vw, 14rem);
		font-weight: 800;
		letter-spacing: -0.04em;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 4px 40px rgba(0, 0, 0, 0.55);
	}

	/* --- hold view (timed exercises) --- */
	.hold {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.7rem;
	}
	.hold-note {
		font-family: var(--mono);
		font-size: 0.8rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(216, 222, 233, 0.5);
	}

	.feedback {
		margin: 0;
		max-width: 90%;
		padding: 0.7rem 1.4rem;
		text-align: center;
		font-size: clamp(1.6rem, 7.5vw, 3rem);
		font-weight: 800;
		line-height: 1.05;
		letter-spacing: -0.015em;
		border-radius: var(--radius-md, 0.5rem);
		border-left: 4px solid var(--tone);
		background: color-mix(in srgb, var(--tone) 16%, rgba(17, 20, 26, 0.55));
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		color: #eceff4;
		text-shadow: 0 2px 14px rgba(0, 0, 0, 0.6);
	}
	.feedback[data-kind='good'] {
		--tone: var(--green, #a3be8c);
	}
	.feedback[data-kind='bad'] {
		--tone: var(--red, #bf616a);
	}
	.feedback[data-kind='advice'] {
		--tone: var(--orange, #d08770);
	}
	.feedback[data-kind='info'] {
		--tone: var(--frost);
	}

	/* --- rest takeover --- */
	.rest {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
	.rest-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.9rem;
		padding: 1rem;
	}
	.rest-clock-btn {
		appearance: none;
		border: none;
		background: none;
		padding: 0;
		color: inherit;
		cursor: pointer;
		border-radius: var(--radius-md, 0.5rem);
	}
	.rest-clock {
		display: block;
		font-family: var(--mono);
		font-size: clamp(5rem, 30vw, 10rem);
		font-weight: 600;
		line-height: 1;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.02em;
		text-shadow: 0 4px 40px rgba(0, 0, 0, 0.6);
		transition: color 250ms ease;
	}
	.rest-clock.low {
		color: var(--orange, #d08770);
	}
	/* Linear decay — a scaled-up RestTimer bar; drains on a 1s linear tick. */
	.decay {
		width: min(85%, 22rem);
		height: 0.5rem;
		margin-top: 0.4rem;
		border-radius: var(--radius-pill, 1000px);
		background: rgba(236, 239, 244, 0.16);
		overflow: hidden;
	}
	.decay-fill {
		height: 100%;
		border-radius: inherit;
		background: var(--frost);
		transition: width 1s linear;
	}
	.decay.low .decay-fill {
		background: var(--orange, #d08770);
	}
	.adjust-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-top: 0.9rem;
	}
	.adjust {
		min-width: 4rem;
		padding: 0.5rem 0.9rem;
		border-radius: var(--radius-pill, 1000px);
		border: 1px solid rgba(236, 239, 244, 0.22);
		background: rgba(46, 52, 64, 0.5);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		color: #eceff4;
		font-family: var(--mono);
		font-size: 0.9rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		cursor: pointer;
		transition:
			background 150ms ease,
			scale 120ms ease;
	}
	.adjust:hover {
		background: rgba(67, 76, 94, 0.65);
	}
	.adjust:active {
		scale: 0.94;
	}
	.adjust-hint {
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		color: rgba(216, 222, 233, 0.5);
	}
	.rest-foot {
		padding: 0 1.25rem calc(env(safe-area-inset-bottom, 0px) + 1.1rem);
	}
	.next-card {
		padding: 0.9rem 1.1rem;
		border: 1px solid rgba(136, 192, 208, 0.28);
		border-radius: var(--radius-lg, 0.75rem);
		background: rgba(30, 34, 42, 0.45);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
	}
	.next-name {
		margin: 0.2rem 0 0.5rem;
		font-size: 1.4rem;
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	/* --- telemetry deck (lifting) --- */
	.deck {
		position: relative;
		padding: 1.1rem 1.25rem calc(env(safe-area-inset-bottom, 0px) + 1.1rem);
	}
	.hairline {
		height: 1px;
		margin-bottom: 1rem;
		background: linear-gradient(to right, transparent, var(--frost), transparent);
		opacity: 0.55;
	}
	.deck-label {
		display: block;
		font-family: var(--mono);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.22em;
		color: rgba(216, 222, 233, 0.55);
		margin-bottom: 0.3rem;
	}
	.lift {
		margin-bottom: 0.9rem;
	}
	.lift-name {
		margin: 0;
		font-size: clamp(1.4rem, 6vw, 1.9rem);
		font-weight: 700;
		letter-spacing: -0.01em;
		line-height: 1.05;
	}
	.grid {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.9rem 1.2rem;
		align-items: end;
	}
	.timer {
		grid-column: 2;
		grid-row: 1 / span 2;
		text-align: right;
	}
	.prescription {
		margin: 0;
		display: flex;
		align-items: baseline;
		gap: 0.28rem;
		font-variant-numeric: tabular-nums;
	}
	.prescription .num {
		font-size: 1.85rem;
		font-weight: 800;
		letter-spacing: -0.02em;
	}
	.prescription .unit {
		font-family: var(--mono);
		font-size: 0.9rem;
		color: rgba(216, 222, 233, 0.65);
	}
	.prescription .mul {
		font-size: 1.2rem;
		color: rgba(216, 222, 233, 0.5);
		margin-inline: 0.1rem;
	}
	.prescription .rpe {
		font-family: var(--mono);
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--frost);
		margin-left: 0.35rem;
	}
	.prescription.ghost {
		color: rgba(216, 222, 233, 0.55);
	}
	.prescription.ghost .num {
		font-size: 1.25rem;
		font-weight: 600;
		color: rgba(216, 222, 233, 0.7);
	}
	.prescription.ghost .rpe {
		color: rgba(216, 222, 233, 0.55);
	}
	.last.empty .prescription {
		opacity: 0.5;
	}
	.timer-row {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 0.6rem;
	}
	.clock {
		font-family: var(--mono);
		font-size: 1.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
	}
	.pause {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 50%;
		border: 1px solid rgba(236, 239, 244, 0.2);
		background: rgba(46, 52, 64, 0.55);
		color: #eceff4;
		cursor: pointer;
		transition:
			background 150ms ease,
			scale 120ms ease;
	}
	.pause:hover {
		background: rgba(67, 76, 94, 0.7);
	}
	.pause:active {
		scale: 0.9;
	}

	/* --- editable set fields --- */
	.log-grid {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
		gap: 0.6rem;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}
	.field-inp {
		display: flex;
		align-items: baseline;
		gap: 0.2rem;
		padding: 0.45rem 0.6rem;
		border: 1px solid rgba(236, 239, 244, 0.18);
		border-radius: var(--radius-md, 0.5rem);
		background: rgba(20, 24, 31, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
	}
	.field-inp:focus-within {
		border-color: var(--frost);
	}
	.field-inp input {
		width: 100%;
		min-width: 0;
		border: none;
		background: none;
		padding: 0;
		color: #eceff4;
		font: inherit;
		font-size: 1.6rem;
		font-weight: 800;
		letter-spacing: -0.02em;
		font-variant-numeric: tabular-nums;
		outline: none;
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.field-inp input::-webkit-outer-spin-button,
	.field-inp input::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
	}
	.field-inp input::placeholder {
		color: rgba(216, 222, 233, 0.35);
	}
	.field-inp i {
		font-family: var(--mono);
		font-style: normal;
		font-size: 0.85rem;
		color: rgba(216, 222, 233, 0.6);
	}
	.last-line {
		margin: 0.7rem 0 0;
		font-size: 0.9rem;
		font-variant-numeric: tabular-nums;
		color: rgba(216, 222, 233, 0.6);
	}
	.last-line .deck-label {
		display: inline;
		margin-right: 0.4rem;
	}
	.last-line .rpe {
		font-family: var(--mono);
		font-weight: 700;
		color: var(--frost);
	}

	/* --- primary actions --- */
	.primary {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		margin-top: 1.1rem;
		padding: 1rem;
		border: none;
		border-radius: var(--radius-pill, 1000px);
		color: #1a2026;
		font-size: 1.1rem;
		font-weight: 800;
		letter-spacing: 0.01em;
		cursor: pointer;
		transition:
			filter 150ms ease,
			scale 120ms ease;
	}
	.primary:hover {
		filter: brightness(1.08);
	}
	.primary:active {
		scale: 0.98;
	}
	.primary.done {
		background: var(--green, #a3be8c);
		box-shadow: 0 6px 24px rgba(163, 190, 140, 0.25);
	}
	.primary.skip {
		background: var(--frost);
		box-shadow: 0 6px 24px rgba(136, 192, 208, 0.25);
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.3;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rec {
			animation: none;
		}
		.reps,
		.back,
		.pause,
		.primary,
		.adjust {
			transition: none;
		}
	}
</style>
