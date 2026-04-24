<script>
	import Plus from '@lucide/svelte/icons/plus';
	import Play from '@lucide/svelte/icons/play';
	import Pause from '@lucide/svelte/icons/pause';
	import X from '@lucide/svelte/icons/x';
	import Check from '@lucide/svelte/icons/check';
	import ExerciseName from '$lib/components/fitness/ExerciseName.svelte';
	import SyncIndicator from '$lib/components/fitness/SyncIndicator.svelte';

	/**
	 * @typedef {{ exerciseId: string, sets: Array<{ completed?: boolean }> }} RailExercise
	 */

	/** @type {{
	 *   exercises: RailExercise[],
	 *   activeIdx: number,
	 *   activeSetIdx: number,
	 *   elapsedLabel: string,
	 *   paused?: boolean,
	 *   syncStatus?: string,
	 *   setsDone: number,
	 *   setsTotal: number,
	 *   addLabel: string,
	 *   pauseLabel?: string,
	 *   resumeLabel?: string,
	 *   removeLabel?: string,
	 *   previousData?: Record<string, Array<{ weight?: number | null, reps?: number | null }>>,
	 *   weightUnit?: string,
	 *   onPauseToggle?: () => void,
	 *   onFocus: (idx: number) => void,
	 *   onAddExercise: () => void,
	 *   onRemove?: (idx: number) => void,
	 *   onReorder?: (fromIdx: number, toIdx: number) => void,
	 * }} */
	let {
		exercises,
		activeIdx,
		activeSetIdx,
		elapsedLabel,
		paused = false,
		syncStatus = 'idle',
		setsDone,
		setsTotal,
		addLabel,
		pauseLabel = 'Pause',
		resumeLabel = 'Resume',
		removeLabel = 'Remove exercise',
		previousData = {},
		weightUnit = 'kg',
		title,
		onPauseToggle,
		onFocus,
		onAddExercise,
		onRemove,
		onReorder
	} = $props();

	/** Drag-and-drop state */
	/** @type {number | null} */
	let draggedIdx = $state(null);
	/** @type {number | null} */
	let dragOverIdx = $state(null);

	/** @type {HTMLOListElement | null} */
	let listEl = $state(null);

	// Keep the active chip at the top of the scrollable list so the user sees current + the next two
	$effect(() => {
		if (!listEl) return;
		const idx = activeIdx;
		if (idx < 0) return;
		const items = listEl.querySelectorAll('.rail-item');
		const target = /** @type {HTMLElement | undefined} */ (items[idx]);
		if (!target) return;
		// Use scrollTop directly to keep the scroll local to the list (avoid page scroll)
		const listTop = listEl.getBoundingClientRect().top;
		const itemTop = target.getBoundingClientRect().top;
		listEl.scrollTo({ top: listEl.scrollTop + (itemTop - listTop), behavior: 'smooth' });
	});

	/** @param {DragEvent} e @param {number} idx */
	function onDragStart(e, idx) {
		draggedIdx = idx;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			// Firefox requires data to be set to initiate a drag
			e.dataTransfer.setData('text/plain', String(idx));
		}
	}

	/** @param {DragEvent} e @param {number} idx */
	function onDragOver(e, idx) {
		if (draggedIdx == null || draggedIdx === idx) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		dragOverIdx = idx;
	}

	/** @param {DragEvent} e @param {number} idx */
	function onDrop(e, idx) {
		e.preventDefault();
		if (draggedIdx != null && draggedIdx !== idx && onReorder) {
			onReorder(draggedIdx, idx);
		}
		draggedIdx = null;
		dragOverIdx = null;
	}

	function onDragEnd() {
		draggedIdx = null;
		dragOverIdx = null;
	}

	const progressPct = $derived(setsTotal > 0 ? (setsDone / setsTotal) * 100 : 0);

	/**
	 * What to rack: starting weight × reps for the first set.
	 * Falls back to the previous session's first set if the current plan is blank.
	 * @param {RailExercise} ex
	 * @returns {string | null}
	 */
	function startingLoadLabel(ex) {
		const first = ex.sets[0];
		const prev = previousData[ex.exerciseId]?.[0];
		/** @type {number | null | undefined} */
		const w = (first && typeof first === 'object' && 'weight' in first ? /** @type {any} */(first).weight : null) ?? prev?.weight;
		/** @type {number | null | undefined} */
		const r = (first && typeof first === 'object' && 'reps' in first ? /** @type {any} */(first).reps : null) ?? prev?.reps;
		if (w != null && w > 0 && r != null && r > 0) return `${w} ${weightUnit} × ${r}`;
		if (w != null && w > 0) return `${w} ${weightUnit}`;
		if (r != null && r > 0) return `× ${r}`;
		return null;
	}
</script>

<aside class="workout-rail" aria-label="Workout overview">
	<header class="rail-header">
		{#if title}
			<div class="rail-title">{@render title()}</div>
		{/if}
		<div class="rail-timer-row">
			<button
				class="rail-pause"
				onclick={() => onPauseToggle?.()}
				aria-label={paused ? resumeLabel : pauseLabel}
				type="button"
			>
				{#if paused}<Play size={14} strokeWidth={2.4} />{:else}<Pause size={14} strokeWidth={2.4} />{/if}
			</button>
			<span class="rail-elapsed" class:paused>{elapsedLabel}</span>
			<span class="rail-sync"><SyncIndicator status={syncStatus} /></span>
		</div>
		<div class="rail-progress">
			<div class="rail-progress-bar">
				<div class="rail-progress-fill" style:width="{progressPct}%"></div>
			</div>
			<span class="rail-progress-label">{setsDone}<span class="rail-progress-sep">/</span>{setsTotal}</span>
		</div>
	</header>

	<ol class="rail-list" bind:this={listEl}>
		{#each exercises as ex, i (i)}
			{@const isActive = i === activeIdx}
			{@const done = ex.sets.filter((s) => s.completed).length}
			{@const complete = done === ex.sets.length && ex.sets.length > 0}
			{@const load = startingLoadLabel(ex)}
			{@const isDragging = draggedIdx === i}
			{@const isDragOver = dragOverIdx === i && draggedIdx !== i}
			{@const dropAbove = isDragOver && (draggedIdx ?? i) > i}
			{@const dropBelow = isDragOver && (draggedIdx ?? i) < i}
			<li
				class="rail-item"
				class:dragging={isDragging}
				class:drop-above={dropAbove}
				class:drop-below={dropBelow}
				class:active={isActive}
				class:complete
				draggable={onReorder ? 'true' : undefined}
				ondragstart={(e) => onDragStart(e, i)}
				ondragover={(e) => onDragOver(e, i)}
				ondrop={(e) => onDrop(e, i)}
				ondragend={onDragEnd}
			>
				<button
					class="rail-chip"
					class:active={isActive}
					class:complete
					onclick={() => onFocus(i)}
					aria-current={isActive ? 'true' : undefined}
					type="button"
				>
					<span class="rail-chip-index">{i + 1}</span>
					<span class="rail-chip-body">
						<span class="rail-chip-name"><ExerciseName exerciseId={ex.exerciseId} plain /></span>
						{#if load}
							<span class="rail-chip-load" aria-label="Starting load">{load}</span>
						{/if}
						<span class="rail-chip-dots" aria-hidden="true">
							{#each ex.sets as s, si (si)}
								<span
									class="rail-dot"
									class:filled={s.completed}
									class:current={isActive && si === activeSetIdx && !s.completed}
								></span>
							{/each}
						</span>
					</span>
					{#if complete}
						<span class="rail-chip-count done" aria-label="Exercise complete">
							<Check size={14} strokeWidth={2.8} />
						</span>
					{:else}
						<span class="rail-chip-count">{done}/{ex.sets.length}</span>
					{/if}
				</button>
				{#if onRemove}
					<button
						class="rail-chip-remove"
						onclick={(e) => { e.stopPropagation(); onRemove?.(i); }}
						aria-label={removeLabel}
						title={removeLabel}
						type="button"
						draggable="false"
						ondragstart={(e) => e.stopPropagation()}
					>
						<X size={14} strokeWidth={2.6} />
					</button>
				{/if}
			</li>
		{/each}
	</ol>

	<button class="rail-add" onclick={onAddExercise} type="button">
		<Plus size={14} strokeWidth={2.4} />
		<span>{addLabel}</span>
	</button>
</aside>

<style>
	.workout-rail {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1rem 0.85rem 0.85rem;
	}

	/* Header: elapsed + progress */
	.rail-header {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
		padding: 0 0.25rem 0.6rem;
		border-bottom: 1px solid var(--color-border);
	}
	.rail-title {
		min-width: 0;
	}
	.rail-title :global(input) {
		width: 100%;
		background: transparent;
		border: none;
		padding: 0.1rem 0;
		color: var(--color-text-primary);
		font-size: 1rem;
		font-weight: 700;
		letter-spacing: -0.01em;
		outline: none;
	}
	.rail-title :global(input::placeholder) {
		color: var(--color-text-tertiary);
		font-weight: 600;
	}
	.rail-title :global(input:focus) {
		color: var(--color-primary);
	}
	.rail-timer-row {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.rail-pause {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.9rem;
		height: 1.9rem;
		border-radius: 100px;
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		color: var(--color-text-primary);
		cursor: pointer;
		flex-shrink: 0;
		transition: background 140ms, color 140ms, border-color 140ms, transform 120ms;
	}
	.rail-pause:hover {
		background: var(--color-bg-elevated);
		color: var(--color-primary);
		border-color: var(--color-primary);
	}
	.rail-pause:active {
		transform: scale(0.94);
	}
	.rail-elapsed {
		flex: 1;
		font-size: 1.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: -0.01em;
		color: var(--color-text-primary);
		line-height: 1.1;
		min-width: 0;
	}
	.rail-elapsed.paused {
		color: var(--nord13);
	}
	.rail-sync {
		display: inline-flex;
		align-items: center;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
	}
	.rail-progress {
		display: flex;
		align-items: center;
		gap: 0.55rem;
	}
	.rail-progress-bar {
		flex: 1;
		height: 6px;
		border-radius: 100px;
		background: var(--color-bg-tertiary);
		overflow: hidden;
	}
	.rail-progress-fill {
		height: 100%;
		border-radius: inherit;
		background: linear-gradient(90deg, color-mix(in srgb, var(--color-primary), transparent 40%), var(--color-primary));
		transition: width 350ms cubic-bezier(0.2, 0.8, 0.2, 1);
	}
	.rail-progress-label {
		font-size: 0.72rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
		letter-spacing: 0.03em;
	}
	.rail-progress-sep {
		color: var(--color-text-tertiary);
		margin-inline: 0.1rem;
	}

	/* Chip list */
	.rail-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		scrollbar-width: thin;
		scrollbar-color: var(--color-border) transparent;
	}
	.rail-list::-webkit-scrollbar {
		width: 4px;
	}
	.rail-list::-webkit-scrollbar-track {
		background: transparent;
	}
	.rail-list::-webkit-scrollbar-thumb {
		background: var(--color-border);
		border-radius: 100px;
	}
	.rail-list::-webkit-scrollbar-thumb:hover {
		background: color-mix(in srgb, var(--color-text-tertiary), transparent 50%);
	}

	/* Row wrapper holds chip + remove button, carries drag state */
	.rail-item {
		position: relative;
		display: flex;
		align-items: stretch;
		border-radius: var(--radius-md, 0.5rem);
		transition: opacity 140ms;
	}
	.rail-item[draggable='true'] {
		cursor: grab;
	}
	.rail-item[draggable='true']:active {
		cursor: grabbing;
	}
	.rail-item.dragging {
		opacity: 0.35;
	}
	.rail-item.drop-above::before,
	.rail-item.drop-below::after {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		border-radius: 100px;
		background: var(--color-primary);
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary), transparent 70%);
	}
	.rail-item.drop-above::before {
		top: -3px;
	}
	.rail-item.drop-below::after {
		bottom: -3px;
	}

	.rail-chip {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		box-sizing: border-box;
		flex: 1;
		min-width: 0;
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 0.55rem;
		padding: 0.55rem 0.55rem 0.55rem 0.45rem;
		border-radius: var(--radius-md, 0.5rem);
		background: transparent;
		border: 1px solid transparent;
		cursor: pointer;
		transition: background 140ms, border-color 140ms, transform 120ms;
	}
	.rail-chip:hover {
		background: var(--color-bg-elevated);
	}
	.rail-chip:active {
		transform: scale(0.98);
	}
	.rail-chip.active {
		background: color-mix(in srgb, var(--color-primary), transparent 82%);
		border-color: transparent;
	}
	.rail-chip.active:hover {
		background: color-mix(in srgb, var(--color-primary), transparent 76%);
	}
	.rail-chip.complete {
		opacity: 0.72;
	}
	.rail-chip.complete.active {
		opacity: 1;
	}

	/* × remove — overlays the set counter on hover (same spot) */
	.rail-chip-remove {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		position: absolute;
		top: 50%;
		right: 0.4rem;
		transform: translateY(-50%);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.55rem;
		height: 1.55rem;
		border-radius: 100px;
		color: var(--nord11);
		opacity: 0;
		pointer-events: none;
		cursor: pointer;
		transition: opacity 140ms, background 140ms, transform 120ms;
		z-index: 1;
	}
	.rail-item:hover .rail-chip-remove,
	.rail-chip-remove:focus-visible {
		opacity: 1;
		pointer-events: auto;
	}
	.rail-chip-remove:hover {
		background: color-mix(in srgb, var(--nord11), transparent 82%);
		transform: translateY(-50%) scale(1.08);
	}
	.rail-chip-remove:active {
		transform: translateY(-50%) scale(0.94);
	}

	.rail-chip-index {
		font-size: 0.65rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		width: 1.25rem;
		text-align: right;
		letter-spacing: 0.04em;
	}
	.rail-chip.active .rail-chip-index {
		color: var(--color-primary);
	}

	.rail-chip-body {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}
	.rail-chip-name {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.rail-chip.active .rail-chip-name {
		font-weight: 700;
	}
	/* Starting weight hint — "what to rack" */
	.rail-chip-load {
		font-size: 0.7rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.01em;
		color: var(--color-text-tertiary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.rail-chip.active .rail-chip-load {
		color: var(--color-primary);
	}
	.rail-chip.complete .rail-chip-load {
		text-decoration: line-through;
		text-decoration-color: color-mix(in srgb, currentColor, transparent 60%);
	}

	.rail-chip-dots {
		display: inline-flex;
		gap: 3px;
		flex-wrap: wrap;
	}
	.rail-dot {
		width: 6px;
		height: 6px;
		border-radius: 100px;
		background: var(--color-border);
		transition: background 180ms, transform 180ms;
	}
	.rail-dot.filled {
		background: color-mix(in srgb, var(--color-primary), transparent 15%);
	}
	.rail-dot.current {
		background: var(--color-primary);
		transform: scale(1.3);
		animation: dot-pulse 1.4s ease-in-out infinite;
	}
	@keyframes dot-pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.55; }
	}

	/* Set counter — visible by default, fades out when × takes over on hover */
	.rail-chip-count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.55rem;
		font-size: 0.7rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-tertiary);
		flex-shrink: 0;
		transition: opacity 140ms;
	}
	.rail-chip.active .rail-chip-count {
		color: var(--color-text-secondary);
	}
	/* Completed exercise: matches the set-complete check button from SetTable */
	.rail-chip-count.done {
		width: 1.55rem;
		height: 1.55rem;
		border-radius: 50%;
		border: 2px solid var(--nord14);
		background: var(--nord14);
		color: white;
	}
	.rail-item:hover .rail-chip-count {
		opacity: 0;
	}

	/* Add exercise button */
	.rail-add {
		all: unset;
		-webkit-tap-highlight-color: transparent;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.55rem 0.75rem;
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		color: var(--color-text-secondary);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.03em;
		cursor: pointer;
		transition: border-color 140ms, color 140ms;
	}
	.rail-add:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	/* Narrow viewports: vertical list, compact chip, dots inline next to name */
	@media (max-width: 899px) {
		.workout-rail {
			gap: 0.6rem;
			padding: 0.75rem 0.75rem 0.6rem;
		}
		/* Title full-width row, timer + progress share a second row */
		.rail-header {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr);
			grid-template-areas:
				"title    title"
				"timer    progress";
			column-gap: 0.75rem;
			row-gap: 0.5rem;
			padding: 0 0.15rem 0.5rem;
			align-items: center;
		}
		.rail-title { grid-area: title; }
		.rail-timer-row {
			grid-area: timer;
			gap: 0.45rem;
		}
		.rail-elapsed {
			flex: initial;
			font-size: 1.05rem;
		}
		.rail-progress {
			grid-area: progress;
			min-width: 0;
		}
		/* Dots jump up next to the name; load sits below on its own row */
		.rail-chip-body {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			grid-template-areas:
				"name dots"
				"load load";
			column-gap: 0.5rem;
			row-gap: 0.1rem;
			align-items: center;
		}
		.rail-chip-name { grid-area: name; }
		.rail-chip-dots { grid-area: dots; flex-wrap: nowrap; }
		.rail-chip-load { grid-area: load; }
		.rail-chip {
			padding: 0.5rem 0.55rem 0.5rem 0.4rem;
		}
		/* Scrollable only on mobile — desktop lets the rail grow */
		.rail-list {
			max-height: 10.5rem;
			overflow-y: auto;
		}
		/* Smaller completion checkmark */
		.rail-chip-count {
			min-width: 1.25rem;
			font-size: 0.65rem;
		}
		.rail-chip-count.done {
			width: 1.25rem;
			height: 1.25rem;
			border-width: 2px;
		}
		.rail-chip-count.done :global(svg) {
			width: 11px;
			height: 11px;
		}
		.rail-add {
			padding: 0.5rem 0.6rem;
			font-size: 0.72rem;
		}
	}
</style>
