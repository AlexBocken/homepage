<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Plus, Trash2, Play, Pencil, X, Save, CalendarClock, ChevronUp, ChevronDown, ArrowRight } from 'lucide-svelte';
	import { getWorkout } from '$lib/js/workout.svelte';
	import { getWorkoutSync } from '$lib/js/workoutSync.svelte';
	import { getExerciseById, getExerciseMetrics, METRIC_LABELS } from '$lib/data/exercises';
	import TemplateCard from '$lib/components/fitness/TemplateCard.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';

	let { data } = $props();

	const workout = getWorkout();
	const sync = getWorkoutSync();
	let templates = $state(data.templates?.templates ? [...data.templates.templates] : []);
	let seeded = $state(false);

	// Schedule state
	/** @type {string[]} */
	let scheduleOrder = $state(data.schedule?.schedule?.templateOrder ?? []);
	/** @type {string | null} */
	let nextTemplateId = $state(data.schedule?.nextTemplateId ?? null);
	let showScheduleEditor = $state(false);
	/** @type {string[]} */
	let editorScheduleOrder = $state([]);
	let scheduleSaving = $state(false);

	// Template detail modal
	/** @type {any} */
	let selectedTemplate = $state(null);

	// Template editor
	let showTemplateEditor = $state(false);
	/** @type {any} */
	let editingTemplate = $state(null);
	let editorName = $state('');
	/** @type {Array<{ exerciseId: string, sets: Array<Record<string, any>>, restTime: number }>} */
	let editorExercises = $state([]);
	let editorPicker = $state(false);
	let editorSaving = $state(false);

	/** @type {any} */
	let nextTemplate = $derived(nextTemplateId ? templates.find((t) => t._id === nextTemplateId) : null);
	let hasSchedule = $derived(scheduleOrder.length > 0);

	onMount(() => {
		workout.restore();

		// If there's an active workout, redirect to the active page
		if (workout.active) {
			goto('/fitness/workout/active');
			return;
		}

		if (templates.length === 0 && !seeded) {
			seeded = true;
			fetch('/api/fitness/templates/seed', { method: 'POST' }).then(async (res) => {
				if (res.ok) {
					const refreshRes = await fetch('/api/fitness/templates');
					const refreshData = await refreshRes.json();
					templates = refreshData.templates ?? [];
				}
			});
		}
	});

	/** @param {any} template */
	function openTemplateDetail(template) {
		selectedTemplate = template;
	}

	function closeTemplateDetail() {
		selectedTemplate = null;
	}

	/** @param {any} template */
	async function startFromTemplate(template) {
		selectedTemplate = null;
		workout.startFromTemplate(template);
		await sync.onWorkoutStart();
		goto('/fitness/workout/active');
	}

	async function startEmpty() {
		workout.startEmpty();
		await sync.onWorkoutStart();
		goto('/fitness/workout/active');
	}

	async function startNextScheduled() {
		if (!nextTemplate) return;
		await startFromTemplate(nextTemplate);
	}

	function openCreateTemplate() {
		editingTemplate = null;
		editorName = '';
		editorExercises = [];
		showTemplateEditor = true;
	}

	/** @param {any} template */
	function openEditTemplate(template) {
		selectedTemplate = null;
		editingTemplate = template;
		editorName = template.name;
		editorExercises = template.exercises.map((/** @type {any} */ ex) => ({
			exerciseId: ex.exerciseId,
			sets: ex.sets.map((/** @type {any} */ s) => ({ ...s })),
			restTime: ex.restTime ?? 120
		}));
		showTemplateEditor = true;
	}

	function closeEditor() {
		showTemplateEditor = false;
		editingTemplate = null;
	}

	/** @param {string} exerciseId */
	function editorAddExercise(exerciseId) {
		const metrics = getExerciseMetrics(getExerciseById(exerciseId));
		/** @type {Record<string, any>} */
		const emptySet = {};
		for (const m of metrics) emptySet[m] = null;
		editorExercises = [...editorExercises, {
			exerciseId,
			sets: [emptySet],
			restTime: 120
		}];
	}

	/** @param {number} idx */
	function editorRemoveExercise(idx) {
		editorExercises = editorExercises.filter((_, i) => i !== idx);
	}

	/** @param {number} idx @param {number} dir */
	function editorMoveExercise(idx, dir) {
		const newIdx = idx + dir;
		if (newIdx < 0 || newIdx >= editorExercises.length) return;
		const copy = [...editorExercises];
		[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
		editorExercises = copy;
	}

	/** @param {number} exIdx */
	function editorAddSet(exIdx) {
		const metrics = getExerciseMetrics(getExerciseById(editorExercises[exIdx].exerciseId));
		/** @type {Record<string, any>} */
		const emptySet = {};
		for (const m of metrics) emptySet[m] = null;
		editorExercises[exIdx].sets = [...editorExercises[exIdx].sets, emptySet];
	}

	/** @param {number} exIdx @param {number} setIdx */
	function editorRemoveSet(exIdx, setIdx) {
		if (editorExercises[exIdx].sets.length > 1) {
			editorExercises[exIdx].sets = editorExercises[exIdx].sets.filter((_, i) => i !== setIdx);
		}
	}

	async function saveTemplate() {
		if (!editorName.trim() || editorExercises.length === 0) return;
		editorSaving = true;

		const body = {
			name: editorName.trim(),
			exercises: editorExercises.map((ex) => {
				const metrics = getExerciseMetrics(getExerciseById(ex.exerciseId));
				return {
					exerciseId: ex.exerciseId,
					sets: ex.sets.map((s) => {
						/** @type {Record<string, any>} */
						const set = {};
						for (const m of metrics) {
							if (s[m] != null) set[m] = s[m];
						}
						return set;
					}),
					restTime: ex.restTime
				};
			})
		};

		try {
			if (editingTemplate) {
				const res = await fetch(`/api/fitness/templates/${editingTemplate._id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (res.ok) {
					const { template } = await res.json();
					templates = templates.map((t) => t._id === template._id ? { ...template, lastUsed: t.lastUsed } : t);
				}
			} else {
				const res = await fetch('/api/fitness/templates', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (res.ok) {
					const { template } = await res.json();
					templates = [...templates, template];
				}
			}
			closeEditor();
		} catch {}
		editorSaving = false;
	}

	/** @param {any} template */
	async function deleteTemplate(template) {
		selectedTemplate = null;
		try {
			const res = await fetch(`/api/fitness/templates/${template._id}`, { method: 'DELETE' });
			if (res.ok) {
				templates = templates.filter((t) => t._id !== template._id);
				// Also remove from schedule if present
				if (scheduleOrder.includes(template._id)) {
					scheduleOrder = scheduleOrder.filter((id) => id !== template._id);
					saveSchedule(scheduleOrder);
				}
			}
		} catch {}
	}

	// Schedule editor functions
	function openScheduleEditor() {
		editorScheduleOrder = [...scheduleOrder];
		showScheduleEditor = true;
	}

	function closeScheduleEditor() {
		showScheduleEditor = false;
	}

	/** @param {number} idx @param {number} dir */
	function moveScheduleItem(idx, dir) {
		const newIdx = idx + dir;
		if (newIdx < 0 || newIdx >= editorScheduleOrder.length) return;
		const copy = [...editorScheduleOrder];
		[copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
		editorScheduleOrder = copy;
	}

	/** @param {string} templateId */
	function toggleScheduleTemplate(templateId) {
		if (editorScheduleOrder.includes(templateId)) {
			editorScheduleOrder = editorScheduleOrder.filter((id) => id !== templateId);
		} else {
			editorScheduleOrder = [...editorScheduleOrder, templateId];
		}
	}

	/** @param {string[]} order */
	async function saveSchedule(order) {
		try {
			const res = await fetch('/api/fitness/schedule', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ templateOrder: order })
			});
			if (res.ok) {
				scheduleOrder = order;
				// Refresh next template
				const schedRes = await fetch('/api/fitness/schedule');
				const schedData = await schedRes.json();
				nextTemplateId = schedData.nextTemplateId ?? null;
			}
		} catch {}
	}

	async function saveAndCloseSchedule() {
		scheduleSaving = true;
		await saveSchedule(editorScheduleOrder);
		scheduleSaving = false;
		showScheduleEditor = false;
	}

	/** @param {string} id */
	function getTemplateName(id) {
		return templates.find((t) => t._id === id)?.name ?? 'Unknown';
	}
</script>

<svelte:head><title>Workout - Fitness</title></svelte:head>

<div class="template-view">
	{#if hasSchedule && nextTemplate}
		<section class="next-workout">
			<div class="next-label">
				<CalendarClock size={16} />
				<span>Next in schedule</span>
			</div>
			<button class="next-workout-btn" onclick={startNextScheduled}>
				<div class="next-info">
					<span class="next-name">{nextTemplate.name}</span>
					<span class="next-exercises">{nextTemplate.exercises.length} exercise{nextTemplate.exercises.length !== 1 ? 's' : ''}</span>
				</div>
				<div class="next-go">
					<Play size={18} />
				</div>
			</button>
			<div class="schedule-preview">
				{#each scheduleOrder as id, i}
					<span class="schedule-dot" class:active={id === nextTemplateId}>{getTemplateName(id)}</span>
					{#if i < scheduleOrder.length - 1}
						<ArrowRight size={12} />
					{/if}
				{/each}
			</div>
		</section>
	{/if}

	<section class="quick-start">
		<button class="start-empty-btn" onclick={startEmpty}>
			START AN EMPTY WORKOUT
		</button>
	</section>

	<section class="templates-section">
		<div class="templates-header">
			<h2>Templates</h2>
			<div class="templates-header-actions">
				<button class="header-icon-btn" onclick={openCreateTemplate} aria-label="Create template">
					<Plus size={18} />
				</button>
				<button class="schedule-btn" onclick={openScheduleEditor} aria-label="Edit workout schedule">
					<CalendarClock size={16} />
					Schedule
				</button>
			</div>
		</div>
		{#if templates.length > 0}
			<p class="template-count">My Templates ({templates.length})</p>
			<div class="template-grid">
				{#each templates as template (template._id)}
					<TemplateCard
						{template}
						lastUsed={template.lastUsed}
						onStart={() => openTemplateDetail(template)}
					/>
				{/each}
			</div>
		{:else}
			<p class="no-templates">No templates yet. Create one or start an empty workout.</p>
		{/if}
	</section>
</div>

<!-- Template Detail Modal -->
{#if selectedTemplate}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onkeydown={(e) => e.key === 'Escape' && closeTemplateDetail()}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-backdrop" onclick={closeTemplateDetail}></div>
		<div class="modal-panel">
			<div class="modal-header">
				<h2>{selectedTemplate.name}</h2>
				<button class="close-btn" onclick={closeTemplateDetail} aria-label="Close"><X size={20} /></button>
			</div>
			<div class="modal-body">
				<ul class="template-exercises">
					{#each selectedTemplate.exercises as ex (ex.exerciseId)}
						{@const exercise = getExerciseById(ex.exerciseId)}
						<li>
							<span class="tex-name">{exercise?.name ?? ex.exerciseId}</span>
							<span class="tex-sets">{ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}</span>
						</li>
					{/each}
				</ul>
				{#if selectedTemplate.lastUsed}
					<p class="modal-meta">Last performed: {new Date(selectedTemplate.lastUsed).toLocaleDateString()}</p>
				{/if}
			</div>
			<div class="modal-actions">
				<button class="modal-start" onclick={() => startFromTemplate(selectedTemplate)}>
					<Play size={16} /> Start Workout
				</button>
				<button class="modal-edit" onclick={() => openEditTemplate(selectedTemplate)}>
					<Pencil size={16} /> Edit Template
				</button>
				<button class="modal-delete" onclick={() => deleteTemplate(selectedTemplate)}>
					<Trash2 size={16} /> Delete
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Template Editor Modal -->
{#if showTemplateEditor}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onkeydown={(e) => e.key === 'Escape' && closeEditor()}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-backdrop" onclick={closeEditor}></div>
		<div class="modal-panel editor-panel">
			<div class="modal-header">
				<h2>{editingTemplate ? 'Edit Template' : 'New Template'}</h2>
				<button class="close-btn" onclick={closeEditor} aria-label="Close"><X size={20} /></button>
			</div>
			<div class="modal-body">
				<input
					class="editor-name"
					type="text"
					placeholder="Template name"
					bind:value={editorName}
				/>

				{#each editorExercises as ex, exIdx (exIdx)}
					{@const exercise = getExerciseById(ex.exerciseId)}
					{@const exMetrics = getExerciseMetrics(exercise).filter((/** @type {string} */ m) => m !== 'rpe')}
				{@const hasRpe = getExerciseMetrics(exercise).includes('rpe')}
					<div class="editor-exercise">
						<div class="editor-ex-header">
							<span class="editor-ex-name">{exercise?.name ?? ex.exerciseId}</span>
							<div class="editor-ex-actions">
								<button class="move-exercise" disabled={exIdx === 0} onclick={() => editorMoveExercise(exIdx, -1)} aria-label="Move up">
									<ChevronUp size={14} />
								</button>
								<button class="move-exercise" disabled={exIdx === editorExercises.length - 1} onclick={() => editorMoveExercise(exIdx, 1)} aria-label="Move down">
									<ChevronDown size={14} />
								</button>
								<button class="remove-exercise" onclick={() => editorRemoveExercise(exIdx)} aria-label="Remove">
									<Trash2 size={14} />
								</button>
							</div>
						</div>
						<div class="editor-sets">
							{#each ex.sets as set, setIdx (setIdx)}
								<div class="editor-set-row">
									<span class="set-num">{setIdx + 1}</span>
									{#each exMetrics as metric, mIdx (metric)}
										{#if mIdx > 0}<span class="set-x">&times;</span>{/if}
										<input type="number" inputmode={metric === 'reps' ? 'numeric' : 'decimal'} placeholder={METRIC_LABELS[metric].toLowerCase()} bind:value={set[metric]} />
									{/each}
									{#if hasRpe}
										<span class="set-x">@</span>
										<input class="rpe-input" type="number" inputmode="numeric" min="1" max="10" placeholder="rpe" bind:value={set.rpe} />
									{/if}
									{#if ex.sets.length > 1}
										<button class="set-remove" onclick={() => editorRemoveSet(exIdx, setIdx)} aria-label="Remove set"><X size={14} /></button>
									{/if}
								</div>
							{/each}
							<button class="editor-add-set" onclick={() => editorAddSet(exIdx)}>+ Add set</button>
						</div>
					</div>
				{/each}

				<button class="editor-add-exercise" onclick={() => editorPicker = true}>
					<Plus size={16} /> Add Exercise
				</button>
			</div>
			<div class="modal-actions">
				<button class="modal-start" onclick={saveTemplate} disabled={editorSaving || !editorName.trim() || editorExercises.length === 0}>
					<Save size={16} /> {editorSaving ? 'Saving…' : 'Save Template'}
				</button>
			</div>
		</div>
	</div>

	{#if editorPicker}
		<ExercisePicker
			onSelect={(id) => { editorAddExercise(id); editorPicker = false; }}
			onClose={() => editorPicker = false}
		/>
	{/if}
{/if}

<!-- Schedule Editor Modal -->
{#if showScheduleEditor}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onkeydown={(e) => e.key === 'Escape' && closeScheduleEditor()}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="modal-backdrop" onclick={closeScheduleEditor}></div>
		<div class="modal-panel editor-panel">
			<div class="modal-header">
				<h2>Workout Schedule</h2>
				<button class="close-btn" onclick={closeScheduleEditor} aria-label="Close"><X size={20} /></button>
			</div>
			<div class="modal-body">
				<p class="schedule-hint">Select templates and arrange their order. After completing a workout, the next one in the rotation will be suggested.</p>

				{#if editorScheduleOrder.length > 0}
					<div class="schedule-order">
						{#each editorScheduleOrder as id, idx (id)}
							<div class="schedule-item">
								<span class="schedule-pos">{idx + 1}</span>
								<span class="schedule-item-name">{getTemplateName(id)}</span>
								<div class="schedule-item-actions">
									<button disabled={idx === 0} onclick={() => moveScheduleItem(idx, -1)} aria-label="Move up">
										<ChevronUp size={16} />
									</button>
									<button disabled={idx === editorScheduleOrder.length - 1} onclick={() => moveScheduleItem(idx, 1)} aria-label="Move down">
										<ChevronDown size={16} />
									</button>
									<button onclick={() => toggleScheduleTemplate(id)} aria-label="Remove from schedule" class="schedule-remove">
										<X size={16} />
									</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<div class="schedule-available">
					<p class="schedule-available-label">Available templates</p>
					{#each templates.filter((t) => !editorScheduleOrder.includes(t._id)) as template (template._id)}
						<button class="schedule-add-item" onclick={() => toggleScheduleTemplate(template._id)}>
							<Plus size={14} />
							<span>{template.name}</span>
						</button>
					{/each}
					{#if templates.filter((t) => !editorScheduleOrder.includes(t._id)).length === 0}
						<p class="schedule-all-added">All templates are in the schedule</p>
					{/if}
				</div>
			</div>
			<div class="modal-actions">
				<button class="modal-start" onclick={saveAndCloseSchedule} disabled={scheduleSaving}>
					<Save size={16} /> {scheduleSaving ? 'Saving…' : 'Save Schedule'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Primary contrast: white in light mode, nord0 in dark mode */
	:global(:root) { --primary-contrast: white; }
	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme="light"])) { --primary-contrast: var(--nord0); }
	}
	:global(:root[data-theme="dark"]) { --primary-contrast: var(--nord0); }

	/* Template View */
	.template-view {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Next Workout Banner */
	.next-workout {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.next-label {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
	}
	.next-workout-btn {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: var(--color-primary);
		color: var(--primary-contrast);
		border: none;
		border-radius: 10px;
		cursor: pointer;
		text-align: left;
		transition: opacity 150ms ease;
	}
	.next-workout-btn:hover {
		opacity: 0.9;
	}
	.next-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.next-name {
		font-weight: 700;
		font-size: 1rem;
	}
	.next-exercises {
		font-size: 0.8rem;
		opacity: 0.85;
	}
	.next-go {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: color-mix(in srgb, var(--primary-contrast) 20%, transparent);
		border-radius: 50%;
	}
	.schedule-preview {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
		font-size: 0.7rem;
		color: var(--color-text-secondary);
	}
	.schedule-dot {
		padding: 0.15rem 0.4rem;
		background: var(--color-bg-elevated);
		border-radius: 4px;
		white-space: nowrap;
	}
	.schedule-dot.active {
		background: var(--color-primary);
		color: var(--primary-contrast);
		font-weight: 600;
	}

	.quick-start {
		text-align: center;
	}
	.start-empty-btn {
		width: 100%;
		padding: 0.9rem;
		background: var(--color-primary);
		color: var(--primary-contrast);
		border: none;
		border-radius: 10px;
		font-weight: 700;
		font-size: 0.9rem;
		cursor: pointer;
		letter-spacing: 0.03em;
	}
	.start-empty-btn:hover {
		opacity: 0.9;
	}
	.templates-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.templates-header-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.header-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.35rem;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
	}
	.header-icon-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.templates-section h2 {
		margin: 0;
		font-size: 1.2rem;
	}
	.schedule-btn {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.65rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-weight: 600;
		cursor: pointer;
	}
	.schedule-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.template-count {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin: 0.25rem 0 0.75rem;
	}
	.template-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
		gap: 0.75rem;
	}
	.no-templates {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 2rem 0;
	}

	/* Modals */
	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.modal-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
	}
	.modal-panel {
		position: relative;
		width: 90%;
		max-width: 420px;
		max-height: 85vh;
		overflow-y: auto;
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
	}
	.editor-panel {
		max-width: 500px;
	}
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid var(--color-border);
	}
	.modal-header h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.25rem;
	}
	.modal-body {
		padding: 1rem;
		flex: 1;
		overflow-y: auto;
	}
	.template-exercises {
		list-style: none;
		padding: 0;
		margin: 0;
	}
	.template-exercises li {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.85rem;
	}
	.tex-name {
		font-weight: 600;
	}
	.tex-sets {
		color: var(--color-text-secondary);
	}
	.modal-meta {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		margin-top: 0.75rem;
	}
	.modal-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		border-top: 1px solid var(--color-border);
	}
	.modal-start {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.65rem;
		background: var(--color-primary);
		color: var(--primary-contrast);
		border: none;
		border-radius: 8px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.modal-start:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.modal-edit {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.65rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: inherit;
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.modal-edit:hover {
		border-color: var(--color-primary);
	}
	.modal-delete {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0.65rem;
		background: transparent;
		border: 1px solid var(--nord11);
		border-radius: 8px;
		color: var(--nord11);
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.modal-delete:hover {
		background: rgba(191, 97, 106, 0.1);
	}

	/* Template Editor */
	.editor-name {
		width: 100%;
		padding: 0.5rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: inherit;
		font-size: 1rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
	}
	.editor-name:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.editor-exercise {
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 10px;
		padding: 0.75rem;
		margin-bottom: 0.5rem;
	}
	.editor-ex-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.editor-ex-name {
		font-weight: 600;
		font-size: 0.85rem;
	}
	.editor-ex-actions {
		display: flex;
		align-items: center;
		gap: 0.15rem;
	}
	.move-exercise {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		opacity: 0.6;
	}
	.move-exercise:hover:not(:disabled) {
		opacity: 1;
		color: var(--color-primary);
	}
	.move-exercise:disabled {
		opacity: 0.2;
		cursor: not-allowed;
	}
	.remove-exercise {
		background: none;
		border: none;
		color: var(--nord11);
		cursor: pointer;
		padding: 0.25rem;
		opacity: 0.6;
	}
	.remove-exercise:hover {
		opacity: 1;
	}
	.editor-sets {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.editor-set-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.set-num {
		width: 1.5rem;
		text-align: center;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		font-weight: 700;
	}
	.editor-set-row input {
		width: 4rem;
		text-align: center;
		padding: 0.3rem;
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: inherit;
		font-size: 0.8rem;
	}
	.editor-set-row input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.set-x {
		color: var(--color-text-secondary);
		font-size: 0.8rem;
	}
	.rpe-input {
		width: 3rem;
	}
	.set-remove {
		background: none;
		border: none;
		color: var(--nord11);
		cursor: pointer;
		padding: 0.15rem;
		opacity: 0.5;
	}
	.set-remove:hover {
		opacity: 1;
	}
	.editor-add-set {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0;
	}
	.editor-add-exercise {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		width: 100%;
		padding: 0.6rem;
		background: transparent;
		border: 1px dashed var(--color-border);
		border-radius: 8px;
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		margin-top: 0.5rem;
	}
	.editor-add-exercise:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	/* Schedule Editor */
	.schedule-hint {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		margin: 0 0 1rem;
		line-height: 1.4;
	}
	.schedule-order {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-bottom: 1rem;
	}
	.schedule-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.65rem;
		background: var(--color-bg-elevated);
		border: 1px solid var(--color-border);
		border-radius: 8px;
	}
	.schedule-pos {
		width: 1.3rem;
		height: 1.3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-primary);
		color: var(--primary-contrast);
		border-radius: 50%;
		font-size: 0.7rem;
		font-weight: 700;
		flex-shrink: 0;
	}
	.schedule-item-name {
		flex: 1;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.schedule-item-actions {
		display: flex;
		gap: 0.15rem;
	}
	.schedule-item-actions button {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.2rem;
		border-radius: 4px;
	}
	.schedule-item-actions button:hover:not(:disabled) {
		color: var(--color-primary);
	}
	.schedule-item-actions button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.schedule-remove:hover:not(:disabled) {
		color: var(--nord11) !important;
	}
	.schedule-available {
		border-top: 1px solid var(--color-border);
		padding-top: 0.75rem;
	}
	.schedule-available-label {
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
		margin: 0 0 0.5rem;
	}
	.schedule-add-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		padding: 0.5rem 0.65rem;
		background: transparent;
		border: 1px dashed var(--color-border);
		border-radius: 8px;
		color: var(--color-text-secondary);
		font-size: 0.85rem;
		font-weight: 600;
		cursor: pointer;
		margin-bottom: 0.35rem;
		text-align: left;
	}
	.schedule-add-item:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.schedule-all-added {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		text-align: center;
		padding: 0.5rem 0;
		margin: 0;
	}
</style>
