<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte';
	import { SKILL_BY_ID, questionFor } from '$lib/js/caseMath/skills';
	import { TIPS } from '$lib/js/caseMath/tips';
	import { grade, parseAnswer, fmtPlain } from '$lib/js/caseMath/parse';
	import { type PlannedQuestion, median } from '$lib/js/caseMath/adaptive';
	import { showAnswer, secs, percent } from '$lib/js/caseMath/display';
	import { localDateStr } from '$lib/js/localDate';
	import AnswerInput from './AnswerInput.svelte';
	import TipCard from './TipCard.svelte';
	import Check from '@lucide/svelte/icons/check';
	import X from '@lucide/svelte/icons/x';

	type Props = {
		mode: 'daily' | 'free';
		/** The daily set, in order. */
		plan?: PlannedQuestion[];
		/** Free play: produce the next question. */
		next?: () => PlannedQuestion;
		/** Free play: start over with a new run. */
		onrestart?: () => void;
		/** Links under the summary (back to the dashboard). */
		after?: Snippet;
	};
	let { mode, plan = [], next, onrestart, after }: Props = $props();

	type Result = PlannedQuestion & { given: string; ms: number; correct: boolean; relErr: number | null };
	type Saved = { levelChanges: Record<string, [number, number]> };

	const ENDPOINT = '/api/case-math/sessions';
	const AUTO_ADVANCE_MS = 450;

	// The questions come from the plan (daily) or the `next` factory (free); both
	// are fixed for the life of the drill, which the page re-keys to restart.
	// svelte-ignore state_referenced_locally
	let current: PlannedQuestion = $state(mode === 'daily' ? plan[0] : next!());
	const question = $derived(questionFor(current.skill, current.level, current.seed));
	const skill = $derived(SKILL_BY_ID[current.skill]);

	let index = $state(0);
	let value = $state('');
	let phase: 'answer' | 'feedback' | 'summary' = $state('answer');
	let last: Result | null = $state(null);
	let results: Result[] = $state([]);
	let startedAt = 0;
	let sessionStart = 0;
	let elapsed = $state(0);
	let saved: Saved | null = $state(null);
	let flushed = false;
	let saving = $state(false);
	let saveError = $state('');
	let tipOpen = $state(false);
	let answerInput: AnswerInput | undefined = $state();

	const total = $derived(mode === 'daily' ? plan.length : null);
	const correctCount = $derived(results.filter((r) => r.correct).length);
	const misses = $derived(results.filter((r) => !r.correct));
	const timeShare = $derived(Math.min(1, elapsed / skill.targetMs(current.level)));

	onMount(() => {
		startedAt = sessionStart = performance.now();
		answerInput?.focus();
		const timer = setInterval(() => {
			if (phase === 'answer') elapsed = performance.now() - startedAt;
		}, 100);
		const onHide = () => flush();
		window.addEventListener('pagehide', onHide);
		return () => {
			clearInterval(timer);
			window.removeEventListener('pagehide', onHide);
			// Navigating away mid-drill still keeps what was answered.
			flush();
		};
	});

	function payload() {
		return {
			mode,
			date: localDateStr(),
			durationMs: Math.round(performance.now() - sessionStart),
			attempts: results.map(({ skill, level, seed, given, ms }) => ({ skill, level, seed, given, ms }))
		};
	}

	/** Fire-and-forget save for a drill abandoned mid-way (tab closed, navigated off). */
	function flush() {
		if (flushed || saved || saving || !results.length) return;
		flushed = true;
		const body = JSON.stringify(payload());
		if (!navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'application/json' }))) {
			void fetch(ENDPOINT, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } });
		}
	}

	async function save() {
		if (!results.length || saved || flushed) return;
		saving = true;
		saveError = '';
		try {
			const res = await fetch(ENDPOINT, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload())
			});
			if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
			saved = (await res.json()) as Saved;
		} catch (e) {
			saveError = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	function submit() {
		if (phase === 'feedback') return advance();
		if (phase !== 'answer') return;
		const ms = Math.round(performance.now() - startedAt);
		elapsed = ms;
		const g = grade(question.answer, parseAnswer(value), question.tolerance);
		last = { ...current, given: value.trim(), ms, correct: g.correct, relErr: g.relErr };
		results.push(last);
		phase = 'feedback';
		tipOpen = false;
		if (g.correct) {
			const answered = index;
			setTimeout(() => {
				if (phase === 'feedback' && index === answered) advance();
			}, AUTO_ADVANCE_MS);
		}
	}

	async function advance() {
		if (mode === 'daily' && index + 1 >= plan.length) return finish();
		index++;
		current = mode === 'daily' ? plan[index] : next!();
		value = '';
		last = null;
		phase = 'answer';
		elapsed = 0;
		startedAt = performance.now();
		await tick();
		answerInput?.focus();
	}

	function finish() {
		phase = 'summary';
		void save();
	}

	function onKey(e: KeyboardEvent) {
		// Enter anywhere moves on from feedback. Inside the answer box the form's
		// own submit already does that, and buttons handle their own Enter.
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
		if (e.key === 'Enter' && phase === 'feedback') {
			e.preventDefault();
			advance();
		}
	}

	const offBy = (r: Result) => (r.relErr === null ? null : fmtPlain(r.relErr * 100, 1));

	/** One mark per question: answered ones coloured, the current one outlined. */
	const STRIP_FREE = 30;
	const strip = $derived.by(() => {
		const done = results.map((r) => (r.correct ? 'right' : 'wrong'));
		if (phase === 'summary') return done;
		if (mode === 'daily') {
			return plan.map((_, i) => (i < done.length ? done[i] : i === index ? 'current' : 'todo'));
		}
		const tail = done.slice(-(STRIP_FREE - 1));
		return phase === 'answer' ? [...tail, 'current'] : tail;
	});

	const totalMinutes = $derived(Math.max(1, Math.round(results.reduce((s, r) => s + r.ms, 0) / 60_000)));
</script>

<svelte:window onkeydown={onKey} />

{#snippet marks(items: string[])}
	<ol class="strip" aria-hidden="true">
		{#each items as mark, i (i)}
			<li class={mark}></li>
		{/each}
	</ol>
{/snippet}

{#if phase !== 'summary'}
	<!-- data-* name the question so e2e specs can work out the answer. -->
	<section
		class="drill"
		aria-live="polite"
		data-skill={current.skill}
		data-level={current.level}
		data-seed={current.seed}
		data-phase={phase}
	>
		<div class="meta">
			<span class="skill">{skill.title}, level {current.level}</span>
			<span class="count">
				{#if total}{index + 1} / {total}{:else}{correctCount} of {results.length} right{/if}
			</span>
		</div>
		{@render marks(strip)}

		<div class="slate" class:graded={phase === 'feedback'}>
			{#if question.facts}
				<ul class="facts">
					{#each question.facts as fact (fact)}
						<li>{fact}</li>
					{/each}
				</ul>
			{/if}
			<p class="prompt" class:ask={question.facts} class:long={!question.facts && question.prompt.length > 32}>
				{question.prompt}
			</p>
			{#if question.tolerance >= 0.03}
				<p class="hint">Estimate: within {fmtPlain(question.tolerance * 100)}% counts</p>
			{/if}
			<div
				class="clock"
				class:over={elapsed > skill.targetMs(current.level)}
				style:width="{timeShare * 100}%"
				aria-hidden="true"
			></div>
		</div>

		<AnswerInput
			bind:this={answerInput}
			bind:value
			unit={question.unit}
			readonly={phase === 'feedback'}
			status={phase === 'feedback' ? (last?.correct ? 'correct' : 'wrong') : 'idle'}
			onsubmit={submit}
		/>

		{#if phase === 'feedback' && last}
			<div class="feedback" class:ok={last.correct}>
				<div class="verdict">
					{#if last.correct}
						<Check size={20} /> <strong>Right</strong>
						<span class="muted">
							in {secs(last.ms)}, target {secs(skill.targetMs(current.level))}{#if question.tolerance > 0 && last.relErr}, off by
								{offBy(last)}%{/if}
						</span>
					{:else}
						<X size={20} /> <strong>{showAnswer(question.answer, question.unit)}</strong>
						<span class="muted">
							{#if last.given}you said {last.given}{#if offBy(last) !== null}, off by {offBy(last)}%{/if}{:else}skipped{/if}
						</span>
					{/if}
				</div>
				{#if !last.correct}
					<ol class="steps">
						{#each question.steps as step, i (i)}
							<li>{step}</li>
						{/each}
					</ol>
					<TipCard tip={TIPS[current.skill]} bind:open={tipOpen} />
					<button class="next" type="button" onclick={advance}>Next question <kbd>Enter</kbd></button>
				{/if}
			</div>
		{:else}
			<p class="keys-hint">
				Press <kbd>Enter</kbd> to answer, or on an empty box to see the solution. Type 3.2M, 450k or 12%.
			</p>
		{/if}

		{#if mode === 'free' && results.length}
			<button class="finish" type="button" onclick={finish}>Finish & save ({results.length})</button>
		{/if}
	</section>
{:else}
	<section class="summary">
		<h2>{mode === 'daily' ? 'Daily set done' : 'Session saved'}</h2>
		<p class="score"><strong>{correctCount}/{results.length}</strong> right</p>
		<p class="tally">
			{percent(results.length ? correctCount / results.length : null)} accuracy, {secs(median(results.map((r) => r.ms)))}
			median per question, about {totalMinutes} min in all.
		</p>
		{@render marks(strip)}

		{#if saving}
			<p class="muted">Saving…</p>
		{:else if saveError}
			<p class="error">Couldn't save: {saveError} <button type="button" onclick={save}>Try again</button></p>
		{:else if saved}
			{@const changes = Object.entries(saved.levelChanges)}
			{#if changes.length}
				<ul class="levels">
					{#each changes as [id, [from, to]] (id)}
						<li class:up={to > from}>
							{SKILL_BY_ID[id]?.title}: level {from} → {to}{to > from ? ', moving up' : ', easing off'}
						</li>
					{/each}
				</ul>
			{/if}
		{/if}

		{#if misses.length}
			<h3>Review</h3>
			<ul class="misses">
				{#each misses as miss (miss.seed)}
					{@const q = questionFor(miss.skill, miss.level, miss.seed)}
					<li>
						{#if q.facts}<div class="miss-facts">{q.facts.join('; ')}</div>{/if}
						<div class="miss-prompt">{q.prompt}</div>
						<div class="miss-answer">
							<strong>{showAnswer(q.answer, q.unit)}</strong>
							<span class="muted">you said {miss.given || 'nothing'}</span>
						</div>
						<ol class="miss-steps">
							{#each q.steps as step, i (i)}<li>{step}</li>{/each}
						</ol>
					</li>
				{/each}
			</ul>
		{/if}

		<div class="actions">
			{#if mode === 'free' && onrestart}
				<button type="button" class="primary" onclick={onrestart}>Keep going</button>
			{/if}
			{@render after?.()}
		</div>
	</section>
{/if}

<style>
	.drill,
	.summary {
		max-width: 640px;
		margin-inline: auto;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.meta {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}

	/* Progress as the record itself: one mark per question. */
	.strip {
		display: flex;
		gap: 3px;
		margin: -0.5rem 0 0;
		padding: 0;
		list-style: none;
	}
	.strip li {
		flex: 1;
		max-width: 2rem;
		height: 6px;
		border-radius: 2px;
		background: var(--color-bg-tertiary);
	}
	.strip li.right {
		background: var(--green);
	}
	.strip li.wrong {
		background: var(--red);
	}
	.strip li.current {
		background: var(--color-primary);
	}

	/* The back of the envelope: squared paper behind the question, and the clock
	   drawn as a line along its bottom edge. */
	.slate {
		--grid: color-mix(in srgb, var(--color-border) 55%, transparent);
		position: relative;
		overflow: hidden;
		padding: 2.25rem 1.5rem 2rem;
		border-radius: var(--radius-lg);
		background-color: var(--color-surface);
		background-image:
			linear-gradient(var(--grid) 1px, transparent 1px),
			linear-gradient(90deg, var(--grid) 1px, transparent 1px);
		background-size: 1.25rem 1.25rem;
		background-position: -1px -1px;
	}
	.facts {
		margin: 0 0 1rem;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: clamp(1.05rem, 3vw, 1.25rem);
		color: var(--color-text-primary);
	}
	.facts li {
		width: fit-content;
		padding: 0.1rem 0.4rem;
		background: var(--color-surface);
		border-radius: var(--radius-sm);
	}
	.prompt {
		margin: 0;
		font-size: clamp(1.9rem, 7vw, 3rem);
		font-weight: 600;
		letter-spacing: -0.01em;
		line-height: 1.15;
		text-align: center;
		text-wrap: balance;
		overflow-wrap: anywhere;
		color: var(--color-text-primary);
	}
	/* Sentences and the ask under a list of givens read as text, not as a sum. */
	.prompt.long,
	.prompt.ask {
		font-size: clamp(1.15rem, 3.5vw, 1.45rem);
		text-align: left;
		line-height: 1.35;
	}
	.prompt.ask {
		font-weight: 700;
	}
	.hint {
		margin: 0.6rem 0 0;
		text-align: center;
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}
	.clock {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 4px;
		background: var(--color-primary);
		transition: width 100ms linear;
	}
	.clock.over {
		background: var(--orange);
	}
	.slate.graded .clock {
		opacity: 0.35;
	}

	.keys-hint {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: 0.85rem;
		text-align: center;
	}
	kbd {
		font-family: inherit;
		font-size: 0.8em;
		padding: 0.05rem 0.35rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-bg-tertiary);
	}
	.feedback {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border-left: 4px solid var(--red);
	}
	.feedback.ok {
		border-left-color: var(--green);
	}
	.verdict {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		font-size: 1.1rem;
	}
	.verdict :global(svg) {
		color: var(--red);
	}
	.feedback.ok .verdict :global(svg) {
		color: var(--green);
	}
	.muted {
		color: var(--color-text-secondary);
		font-size: 0.95rem;
	}
	.steps,
	.miss-steps {
		margin: 0;
		padding-left: 1.4rem;
		line-height: 1.6;
		color: var(--color-text-tertiary);
	}
	button.next,
	.actions .primary {
		align-self: flex-end;
		padding: 0.55rem 1.2rem;
		border: none;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-size: 1rem;
		cursor: pointer;
		transition: background var(--transition-fast);
	}
	button.next:hover,
	.actions .primary:hover {
		background: var(--color-primary-hover);
	}
	button.next kbd {
		background: transparent;
		border-color: currentColor;
		color: inherit;
		opacity: 0.8;
	}
	.finish {
		align-self: center;
		padding: 0.45rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		color: var(--color-text-primary);
		cursor: pointer;
	}
	.finish:hover {
		background: var(--color-bg-elevated);
	}

	.summary h2 {
		margin: 0;
	}
	.score {
		margin: 0;
		font-size: 1.3rem;
	}
	.score strong {
		font-size: 2.6rem;
		letter-spacing: -0.02em;
	}
	.tally {
		margin: -0.5rem 0 0.5rem;
		color: var(--color-text-secondary);
	}
	.summary .strip {
		margin: 0;
	}
	.levels {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		color: var(--orange);
	}
	.levels .up {
		color: var(--green);
	}
	.summary h3 {
		margin: 0.75rem 0 0;
	}
	.misses {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.misses li {
		padding: 0.75rem 1rem;
		background: var(--color-surface);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.miss-facts {
		color: var(--color-text-secondary);
		font-size: 0.9rem;
	}
	.miss-prompt {
		font-weight: 600;
	}
	.miss-answer {
		display: flex;
		gap: 0.6rem;
		align-items: baseline;
		flex-wrap: wrap;
	}
	.miss-steps {
		font-size: 0.9rem;
	}
	.error {
		color: var(--red);
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 0.5rem;
	}
	.actions .primary {
		align-self: auto;
	}
	.actions :global(a) {
		color: var(--color-text-secondary);
	}
	@media (max-width: 560px) {
		.slate {
			padding: 1.5rem 1rem 1.5rem;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.clock {
			transition: none;
		}
	}
</style>
