<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { Plus, Trash2, Play, Pencil, X, Save } from 'lucide-svelte';
	import { getWorkout } from '$lib/js/workout.svelte';
	import { getExerciseById } from '$lib/data/exercises';
	import TemplateCard from '$lib/components/fitness/TemplateCard.svelte';
	import ExercisePicker from '$lib/components/fitness/ExercisePicker.svelte';
	import AddActionButton from '$lib/components/AddActionButton.svelte';

	let { data } = $props();

	const workout = getWorkout();
	let templates = $state(data.templates?.templates ? [...data.templates.templates] : []);
	let seeded = $state(false);

	// Template detail modal
	/** @type {any} */
	let selectedTemplate = $state(null);

	// Template editor
	let showTemplateEditor = $state(false);
	/** @type {any} */
	let editingTemplate = $state(null);
	let editorName = $state('');
	/** @type {Array<{ exerciseId: string, sets: Array<{ reps: number | null, weight: number | null }>, restTime: number }>} */
	let editorExercises = $state([]);
	let editorPicker = $state(false);
	let editorSaving = $state(false);

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
		goto('/fitness/workout/active');
	}

	function startEmpty() {
		workout.startEmpty();
		goto('/fitness/workout/active');
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
			sets: ex.sets.map((/** @type {any} */ s) => ({ reps: s.reps ?? null, weight: s.weight ?? null })),
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
		editorExercises = [...editorExercises, {
			exerciseId,
			sets: [{ reps: null, weight: null }],
			restTime: 120
		}];
	}

	/** @param {number} idx */
	function editorRemoveExercise(idx) {
		editorExercises = editorExercises.filter((_, i) => i !== idx);
	}

	/** @param {number} exIdx */
	function editorAddSet(exIdx) {
		editorExercises[exIdx].sets = [...editorExercises[exIdx].sets, { reps: null, weight: null }];
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
			exercises: editorExercises.map((ex) => ({
				exerciseId: ex.exerciseId,
				sets: ex.sets.map((s) => ({
					reps: s.reps ?? 1,
					weight: s.weight ?? undefined
				})),
				restTime: ex.restTime
			}))
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
			}
		} catch {}
	}
</script>

<div class="template-view">
	<section class="quick-start">
		<button class="start-empty-btn" onclick={startEmpty}>
			START AN EMPTY WORKOUT
		</button>
	</section>

	<section class="templates-section">
		<h2>Templates</h2>
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
					<div class="editor-exercise">
						<div class="editor-ex-header">
							<span class="editor-ex-name">{exercise?.name ?? ex.exerciseId}</span>
							<button class="remove-exercise" onclick={() => editorRemoveExercise(exIdx)} aria-label="Remove">
								<Trash2 size={14} />
							</button>
						</div>
						<div class="editor-sets">
							{#each ex.sets as set, setIdx (setIdx)}
								<div class="editor-set-row">
									<span class="set-num">{setIdx + 1}</span>
									<input type="number" inputmode="numeric" placeholder="reps" bind:value={set.reps} />
									<span class="set-x">&times;</span>
									<input type="number" inputmode="decimal" placeholder="kg" bind:value={set.weight} />
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

{#if !workout.active}
	<AddActionButton onclick={openCreateTemplate} ariaLabel="Create template" />
{/if}

<style>
	/* Template View */
	.template-view {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}
	.quick-start {
		text-align: center;
	}
	.start-empty-btn {
		width: 100%;
		padding: 0.9rem;
		background: var(--color-primary);
		color: white;
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
	.templates-section h2 {
		margin: 0;
		font-size: 1.2rem;
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
		color: white;
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

</style>
