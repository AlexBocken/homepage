<script>
	import { page } from '$app/stores';
	import { Pencil, Trash2 } from 'lucide-svelte';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	import { getWorkout } from '$lib/js/workout.svelte';
	import AddActionButton from '$lib/components/AddActionButton.svelte';

	let { data } = $props();
	const workout = getWorkout();

	let latest = $state(data.latest ? { ...data.latest } : {});
	let measurements = $state(data.measurements?.measurements ? [...data.measurements.measurements] : []);
	let showForm = $state(false);
	let saving = $state(false);
	/** @type {string | null} */
	let editingId = $state(null);

	// Form fields
	let formDate = $state('');
	let formWeight = $state('');
	let formBodyFat = $state('');
	let formCalories = $state('');
	let formNeck = $state('');
	let formShoulders = $state('');
	let formChest = $state('');
	let formBicepsL = $state('');
	let formBicepsR = $state('');
	let formForearmsL = $state('');
	let formForearmsR = $state('');
	let formWaist = $state('');
	let formHips = $state('');
	let formThighsL = $state('');
	let formThighsR = $state('');
	let formCalvesL = $state('');
	let formCalvesR = $state('');

	const bodyPartFields = $derived([
		{ label: t('neck', lang), key: 'neck', value: latest.measurements?.neck },
		{ label: t('shoulders', lang), key: 'shoulders', value: latest.measurements?.shoulders },
		{ label: t('chest', lang), key: 'chest', value: latest.measurements?.chest },
		{ label: t('l_bicep', lang), key: 'bicepsLeft', value: latest.measurements?.biceps?.left },
		{ label: t('r_bicep', lang), key: 'bicepsRight', value: latest.measurements?.biceps?.right },
		{ label: t('l_forearm', lang), key: 'forearmsLeft', value: latest.measurements?.forearms?.left },
		{ label: t('r_forearm', lang), key: 'forearmsRight', value: latest.measurements?.forearms?.right },
		{ label: t('waist', lang), key: 'waist', value: latest.measurements?.waist },
		{ label: t('hips', lang), key: 'hips', value: latest.measurements?.hips },
		{ label: t('l_thigh', lang), key: 'thighsLeft', value: latest.measurements?.thighs?.left },
		{ label: t('r_thigh', lang), key: 'thighsRight', value: latest.measurements?.thighs?.right },
		{ label: t('l_calf', lang), key: 'calvesLeft', value: latest.measurements?.calves?.left },
		{ label: t('r_calf', lang), key: 'calvesRight', value: latest.measurements?.calves?.right }
	]);

	function resetForm() {
		formDate = new Date().toISOString().slice(0, 10);
		formWeight = '';
		formBodyFat = '';
		formCalories = '';
		formNeck = '';
		formShoulders = '';
		formChest = '';
		formBicepsL = '';
		formBicepsR = '';
		formForearmsL = '';
		formForearmsR = '';
		formWaist = '';
		formHips = '';
		formThighsL = '';
		formThighsR = '';
		formCalvesL = '';
		formCalvesR = '';
		editingId = null;
	}

	/** @param {any} m */
	function populateForm(m) {
		formDate = new Date(m.date).toISOString().slice(0, 10);
		formWeight = m.weight != null ? String(m.weight) : '';
		formBodyFat = m.bodyFatPercent != null ? String(m.bodyFatPercent) : '';
		formCalories = m.caloricIntake != null ? String(m.caloricIntake) : '';
		const bp = m.measurements ?? {};
		formNeck = bp.neck != null ? String(bp.neck) : '';
		formShoulders = bp.shoulders != null ? String(bp.shoulders) : '';
		formChest = bp.chest != null ? String(bp.chest) : '';
		const bl = bp.biceps?.left ?? bp.leftBicep;
		const br = bp.biceps?.right ?? bp.rightBicep;
		formBicepsL = bl != null ? String(bl) : '';
		formBicepsR = br != null ? String(br) : '';
		const fl = bp.forearms?.left ?? bp.leftForearm;
		const fr = bp.forearms?.right ?? bp.rightForearm;
		formForearmsL = fl != null ? String(fl) : '';
		formForearmsR = fr != null ? String(fr) : '';
		formWaist = bp.waist != null ? String(bp.waist) : '';
		formHips = bp.hips != null ? String(bp.hips) : '';
		const tl = bp.thighs?.left ?? bp.leftThigh;
		const tr = bp.thighs?.right ?? bp.rightThigh;
		formThighsL = tl != null ? String(tl) : '';
		formThighsR = tr != null ? String(tr) : '';
		const cl = bp.calves?.left ?? bp.leftCalf;
		const cr = bp.calves?.right ?? bp.rightCalf;
		formCalvesL = cl != null ? String(cl) : '';
		formCalvesR = cr != null ? String(cr) : '';
	}

	/** @param {any} m */
	function startEdit(m) {
		populateForm(m);
		editingId = m._id;
		showForm = true;
	}

	function startAdd() {
		resetForm();
		editingId = null;
		showForm = true;
	}

	function buildBody() {
		/** @type {any} */
		const body = { date: formDate };
		if (formWeight) body.weight = Number(formWeight);
		else body.weight = null;
		if (formBodyFat) body.bodyFatPercent = Number(formBodyFat);
		else body.bodyFatPercent = null;
		if (formCalories) body.caloricIntake = Number(formCalories);
		else body.caloricIntake = null;

		/** @type {any} */
		const m = {};
		if (formNeck) m.neck = Number(formNeck);
		if (formShoulders) m.shoulders = Number(formShoulders);
		if (formChest) m.chest = Number(formChest);
		if (formBicepsL || formBicepsR) m.biceps = {};
		if (formBicepsL) m.biceps.left = Number(formBicepsL);
		if (formBicepsR) m.biceps.right = Number(formBicepsR);
		if (formForearmsL || formForearmsR) m.forearms = {};
		if (formForearmsL) m.forearms.left = Number(formForearmsL);
		if (formForearmsR) m.forearms.right = Number(formForearmsR);
		if (formWaist) m.waist = Number(formWaist);
		if (formHips) m.hips = Number(formHips);
		if (formThighsL || formThighsR) m.thighs = {};
		if (formThighsL) m.thighs.left = Number(formThighsL);
		if (formThighsR) m.thighs.right = Number(formThighsR);
		if (formCalvesL || formCalvesR) m.calves = {};
		if (formCalvesL) m.calves.left = Number(formCalvesL);
		if (formCalvesR) m.calves.right = Number(formCalvesR);

		body.measurements = Object.keys(m).length > 0 ? m : null;
		return body;
	}

	async function refreshLatest() {
		try {
			const latestRes = await fetch('/api/fitness/measurements/latest');
			latest = await latestRes.json();
		} catch {}
	}

	async function saveMeasurement() {
		saving = true;
		const body = buildBody();

		try {
			if (editingId) {
				const res = await fetch(`/api/fitness/measurements/${editingId}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (res.ok) {
					const d = await res.json();
					measurements = measurements.map((m) => m._id === editingId ? d.measurement : m);
					await refreshLatest();
					showForm = false;
					resetForm();
				}
			} else {
				const res = await fetch('/api/fitness/measurements', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body)
				});
				if (res.ok) {
					const d = await res.json();
					measurements = [d.measurement, ...measurements];
					await refreshLatest();
					showForm = false;
					resetForm();
				}
			}
		} catch {}
		saving = false;
	}

	/** @param {string} id */
	async function deleteMeasurement(id) {
		if (!confirm(t('delete_measurement_confirm', lang))) return;
		try {
			const res = await fetch(`/api/fitness/measurements/${id}`, { method: 'DELETE' });
			if (res.ok) {
				measurements = measurements.filter((m) => m._id !== id);
				await refreshLatest();
				if (editingId === id) {
					showForm = false;
					resetForm();
				}
			}
		} catch {}
	}

	/** @param {string} dateStr */
	function formatDate(dateStr) {
		const d = new Date(dateStr);
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
	}

	/** @param {any} m */
	function summaryParts(m) {
		/** @type {string[]} */
		const parts = [];
		if (m.weight != null) parts.push(`${m.weight} kg`);
		if (m.bodyFatPercent != null) parts.push(`${m.bodyFatPercent}% bf`);
		if (m.caloricIntake != null) parts.push(`${m.caloricIntake} kcal`);
		return parts.join(' · ') || t('body_measurements_only', lang);
	}
</script>

<svelte:head><title>{lang === 'en' ? 'Measure' : 'Messen'} - Fitness</title></svelte:head>

<div class="measure-page">
	<h1>{t('measure_title', lang)}</h1>

	{#if showForm}
		<form class="measure-form" onsubmit={(e) => { e.preventDefault(); saveMeasurement(); }}>
			<div class="form-header">
				<h2>{editingId ? t('edit_measurement', lang) : t('new_measurement', lang)}</h2>
				<button type="button" class="cancel-form-btn" onclick={() => { showForm = false; resetForm(); }}>{t('cancel', lang)}</button>
			</div>

			<div class="form-group">
				<label for="m-date">{t('date', lang)}</label>
				<input id="m-date" type="date" bind:value={formDate} />
			</div>

			<h3>{t('general', lang)}</h3>
			<div class="form-row">
				<div class="form-group">
					<label for="m-weight">{t('weight_kg', lang)}</label>
					<input id="m-weight" type="number" step="0.1" bind:value={formWeight} placeholder="—" />
				</div>
				<div class="form-group">
					<label for="m-bf">{t('body_fat_pct', lang)}</label>
					<input id="m-bf" type="number" step="0.1" bind:value={formBodyFat} placeholder="—" />
				</div>
				<div class="form-group">
					<label for="m-cal">{t('calories_kcal', lang)}</label>
					<input id="m-cal" type="number" bind:value={formCalories} placeholder="—" />
				</div>
			</div>

			<h3>{t('body_parts_cm', lang)}</h3>
			<div class="form-row">
				<div class="form-group"><label for="m-neck">{t('neck', lang)}</label><input id="m-neck" type="number" step="0.1" bind:value={formNeck} placeholder="—" /></div>
				<div class="form-group"><label for="m-shoulders">{t('shoulders', lang)}</label><input id="m-shoulders" type="number" step="0.1" bind:value={formShoulders} placeholder="—" /></div>
				<div class="form-group"><label for="m-chest">{t('chest', lang)}</label><input id="m-chest" type="number" step="0.1" bind:value={formChest} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-bl">{t('l_bicep', lang)}</label><input id="m-bl" type="number" step="0.1" bind:value={formBicepsL} placeholder="—" /></div>
				<div class="form-group"><label for="m-br">{t('r_bicep', lang)}</label><input id="m-br" type="number" step="0.1" bind:value={formBicepsR} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-fl">{t('l_forearm', lang)}</label><input id="m-fl" type="number" step="0.1" bind:value={formForearmsL} placeholder="—" /></div>
				<div class="form-group"><label for="m-fr">{t('r_forearm', lang)}</label><input id="m-fr" type="number" step="0.1" bind:value={formForearmsR} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-waist">{t('waist', lang)}</label><input id="m-waist" type="number" step="0.1" bind:value={formWaist} placeholder="—" /></div>
				<div class="form-group"><label for="m-hips">{t('hips', lang)}</label><input id="m-hips" type="number" step="0.1" bind:value={formHips} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-tl">{t('l_thigh', lang)}</label><input id="m-tl" type="number" step="0.1" bind:value={formThighsL} placeholder="—" /></div>
				<div class="form-group"><label for="m-tr">{t('r_thigh', lang)}</label><input id="m-tr" type="number" step="0.1" bind:value={formThighsR} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-cl">{t('l_calf', lang)}</label><input id="m-cl" type="number" step="0.1" bind:value={formCalvesL} placeholder="—" /></div>
				<div class="form-group"><label for="m-cr">{t('r_calf', lang)}</label><input id="m-cr" type="number" step="0.1" bind:value={formCalvesR} placeholder="—" /></div>
			</div>

			<button type="submit" class="save-btn" disabled={saving}>
				{saving ? t('saving', lang) : editingId ? t('update_measurement', lang) : t('save_measurement', lang)}
			</button>
		</form>
	{/if}

	<section class="latest-section">
		<h2>{t('latest', lang)}</h2>
		<div class="stat-grid">
			<div class="stat-card">
				<span class="stat-label">{t('weight', lang)}</span>
				<span class="stat-value">{latest.weight?.value ?? '—'} <small>kg</small></span>
			</div>
			<div class="stat-card">
				<span class="stat-label">{t('body_fat', lang)}</span>
				<span class="stat-value">{latest.bodyFatPercent?.value ?? '—'}<small>%</small></span>
			</div>
			<div class="stat-card">
				<span class="stat-label">{t('calories', lang)}</span>
				<span class="stat-value">{latest.caloricIntake?.value ?? '—'} <small>kcal</small></span>
			</div>
		</div>
	</section>

	{#if bodyPartFields.some(f => f.value != null)}
		<section class="body-parts-section">
			<h2>{t('body_parts', lang)}</h2>
			<div class="body-grid">
				{#each bodyPartFields.filter(f => f.value != null) as field}
					<div class="body-row">
						<span class="body-label">{field.label}</span>
						<span class="body-value">{field.value} cm</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	{#if measurements.length > 0}
		<section class="history-section">
			<h2>{t('history', lang)}</h2>
			<div class="history-list">
				{#each measurements as m (m._id)}
					<div class="history-item" class:editing={editingId === m._id}>
						<div class="history-main">
							<div class="history-info">
								<span class="history-date">{formatDate(m.date)}</span>
								<span class="history-summary">{summaryParts(m)}</span>
							</div>
							<div class="history-actions">
								<button class="icon-btn edit" onclick={() => startEdit(m)} aria-label="Edit measurement">
									<Pencil size={14} />
								</button>
								<button class="icon-btn delete" onclick={() => deleteMeasurement(m._id)} aria-label="Delete measurement">
									<Trash2 size={14} />
								</button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

{#if !workout.active}
	<AddActionButton onclick={startAdd} ariaLabel="Add measurement" />
{/if}

<style>
	.measure-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	h2 {
		margin: 0 0 0.5rem;
		font-size: 1.1rem;
	}
	h3 {
		margin: 0.75rem 0 0.25rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}

	/* Form */
	.measure-form {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	.form-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}
	.form-header h2 {
		margin: 0;
		font-size: 1rem;
	}
	.cancel-form-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		padding: 0.3rem 0.75rem;
		font-weight: 700;
		font-size: 0.75rem;
		cursor: pointer;
		letter-spacing: 0.03em;
	}
	.cancel-form-btn:hover {
		border-color: var(--color-text-primary);
		color: var(--color-text-primary);
	}
	.form-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.form-group {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-bottom: 0.4rem;
	}
	.form-group label {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.form-group input {
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		background: var(--color-bg-elevated);
		color: inherit;
		font-size: 0.85rem;
	}
	.form-group input:focus {
		outline: none;
		border-color: var(--color-primary);
	}
	.save-btn {
		width: 100%;
		margin-top: 0.75rem;
		padding: 0.7rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-weight: 700;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Latest */
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6rem;
	}
	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.75rem;
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
	}
	.stat-label {
		font-size: 0.7rem;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.stat-value {
		font-size: 1.25rem;
		font-weight: 700;
	}
	.stat-value small {
		font-size: 0.7rem;
		font-weight: 400;
		color: var(--color-text-secondary);
	}

	/* Body parts */
	.body-grid {
		display: flex;
		flex-direction: column;
	}
	.body-row {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--color-border);
		font-size: 0.85rem;
	}
	.body-label {
		color: var(--color-text-secondary);
	}
	.body-value {
		font-weight: 600;
	}

	/* History */
	.history-list {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.history-item {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.6rem 0.75rem;
	}
	.history-item.editing {
		border: 1px solid var(--color-primary);
	}
	.history-main {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.5rem;
	}
	.history-info {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}
	.history-date {
		font-size: 0.8rem;
		font-weight: 600;
	}
	.history-summary {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.history-actions {
		display: flex;
		gap: 0.3rem;
		flex-shrink: 0;
	}
	.icon-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
	}
	.icon-btn.edit:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.icon-btn.delete {
		border-color: transparent;
		opacity: 0.5;
	}
	.icon-btn.delete:hover {
		border-color: var(--nord11);
		color: var(--nord11);
		opacity: 1;
	}

	@media (max-width: 480px) {
		.stat-grid {
			grid-template-columns: 1fr;
		}
		.form-row {
			flex-direction: column;
		}
	}
</style>
