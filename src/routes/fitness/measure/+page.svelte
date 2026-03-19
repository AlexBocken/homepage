<script>
	import { X } from 'lucide-svelte';
	import { getWorkout } from '$lib/js/workout.svelte';
	import AddActionButton from '$lib/components/AddActionButton.svelte';

	let { data } = $props();
	const workout = getWorkout();

	let latest = $state(data.latest ? { ...data.latest } : {});
	let measurements = $state(data.measurements?.measurements ? [...data.measurements.measurements] : []);
	let showForm = $state(false);
	let saving = $state(false);

	// Form fields
	let formDate = $state(new Date().toISOString().slice(0, 10));
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
		{ label: 'Neck', key: 'neck', value: latest.measurements?.neck },
		{ label: 'Shoulders', key: 'shoulders', value: latest.measurements?.shoulders },
		{ label: 'Chest', key: 'chest', value: latest.measurements?.chest },
		{ label: 'Left Bicep', key: 'bicepsLeft', value: latest.measurements?.biceps?.left },
		{ label: 'Right Bicep', key: 'bicepsRight', value: latest.measurements?.biceps?.right },
		{ label: 'Left Forearm', key: 'forearmsLeft', value: latest.measurements?.forearms?.left },
		{ label: 'Right Forearm', key: 'forearmsRight', value: latest.measurements?.forearms?.right },
		{ label: 'Waist', key: 'waist', value: latest.measurements?.waist },
		{ label: 'Hips', key: 'hips', value: latest.measurements?.hips },
		{ label: 'Left Thigh', key: 'thighsLeft', value: latest.measurements?.thighs?.left },
		{ label: 'Right Thigh', key: 'thighsRight', value: latest.measurements?.thighs?.right },
		{ label: 'Left Calf', key: 'calvesLeft', value: latest.measurements?.calves?.left },
		{ label: 'Right Calf', key: 'calvesRight', value: latest.measurements?.calves?.right }
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
	}

	async function saveMeasurement() {
		saving = true;

		/** @type {any} */
		const body = { date: formDate };
		if (formWeight) body.weight = Number(formWeight);
		if (formBodyFat) body.bodyFatPercent = Number(formBodyFat);
		if (formCalories) body.caloricIntake = Number(formCalories);

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

		if (Object.keys(m).length > 0) body.measurements = m;

		try {
			const res = await fetch('/api/fitness/measurements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				const newEntry = await res.json();
				measurements = [newEntry, ...measurements];
				// Refresh latest
				const latestRes = await fetch('/api/fitness/measurements/latest');
				latest = await latestRes.json();
				showForm = false;
				resetForm();
			}
		} catch {}
		saving = false;
	}
</script>

<div class="measure-page">
	<h1>Measure</h1>

	{#if showForm}
		<form class="measure-form" onsubmit={(e) => { e.preventDefault(); saveMeasurement(); }}>
			<div class="form-group">
				<label for="m-date">Date</label>
				<input id="m-date" type="date" bind:value={formDate} />
			</div>

			<h3>General</h3>
			<div class="form-row">
				<div class="form-group">
					<label for="m-weight">Weight (kg)</label>
					<input id="m-weight" type="number" step="0.1" bind:value={formWeight} placeholder="—" />
				</div>
				<div class="form-group">
					<label for="m-bf">Body Fat %</label>
					<input id="m-bf" type="number" step="0.1" bind:value={formBodyFat} placeholder="—" />
				</div>
				<div class="form-group">
					<label for="m-cal">Calories (kcal)</label>
					<input id="m-cal" type="number" bind:value={formCalories} placeholder="—" />
				</div>
			</div>

			<h3>Body Parts (cm)</h3>
			<div class="form-row">
				<div class="form-group"><label for="m-neck">Neck</label><input id="m-neck" type="number" step="0.1" bind:value={formNeck} placeholder="—" /></div>
				<div class="form-group"><label for="m-shoulders">Shoulders</label><input id="m-shoulders" type="number" step="0.1" bind:value={formShoulders} placeholder="—" /></div>
				<div class="form-group"><label for="m-chest">Chest</label><input id="m-chest" type="number" step="0.1" bind:value={formChest} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-bl">L Bicep</label><input id="m-bl" type="number" step="0.1" bind:value={formBicepsL} placeholder="—" /></div>
				<div class="form-group"><label for="m-br">R Bicep</label><input id="m-br" type="number" step="0.1" bind:value={formBicepsR} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-fl">L Forearm</label><input id="m-fl" type="number" step="0.1" bind:value={formForearmsL} placeholder="—" /></div>
				<div class="form-group"><label for="m-fr">R Forearm</label><input id="m-fr" type="number" step="0.1" bind:value={formForearmsR} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-waist">Waist</label><input id="m-waist" type="number" step="0.1" bind:value={formWaist} placeholder="—" /></div>
				<div class="form-group"><label for="m-hips">Hips</label><input id="m-hips" type="number" step="0.1" bind:value={formHips} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-tl">L Thigh</label><input id="m-tl" type="number" step="0.1" bind:value={formThighsL} placeholder="—" /></div>
				<div class="form-group"><label for="m-tr">R Thigh</label><input id="m-tr" type="number" step="0.1" bind:value={formThighsR} placeholder="—" /></div>
			</div>
			<div class="form-row">
				<div class="form-group"><label for="m-cl">L Calf</label><input id="m-cl" type="number" step="0.1" bind:value={formCalvesL} placeholder="—" /></div>
				<div class="form-group"><label for="m-cr">R Calf</label><input id="m-cr" type="number" step="0.1" bind:value={formCalvesR} placeholder="—" /></div>
			</div>

			<button type="submit" class="save-btn" disabled={saving}>
				{saving ? 'Saving…' : 'Save Measurement'}
			</button>
		</form>
	{/if}

	<section class="latest-section">
		<h2>Latest</h2>
		<div class="stat-grid">
			<div class="stat-card">
				<span class="stat-label">Weight</span>
				<span class="stat-value">{latest.weight?.value ?? '—'} <small>kg</small></span>
			</div>
			<div class="stat-card">
				<span class="stat-label">Body Fat</span>
				<span class="stat-value">{latest.bodyFatPercent?.value ?? '—'}<small>%</small></span>
			</div>
			<div class="stat-card">
				<span class="stat-label">Calories</span>
				<span class="stat-value">{latest.caloricIntake?.value ?? '—'} <small>kcal</small></span>
			</div>
		</div>
	</section>

	{#if bodyPartFields.some(f => f.value != null)}
		<section class="body-parts-section">
			<h2>Body Parts</h2>
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
</div>

{#if !workout.active}
	<AddActionButton onclick={() => showForm = !showForm} ariaLabel="Add measurement" />
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
		color: var(--nord4);
	}

	/* Form */
	.measure-form {
		background: var(--accent-dark);
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		padding: 1rem;
	}
	.form-row {
		display: flex;
		gap: 0.5rem;
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
		color: var(--nord4);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	.form-group input {
		padding: 0.4rem 0.5rem;
		border: 1px solid var(--nord3);
		border-radius: 6px;
		background: var(--nord0, white);
		color: inherit;
		font-size: 0.85rem;
	}
	.form-group input:focus {
		outline: none;
		border-color: var(--nord8);
	}
	.save-btn {
		width: 100%;
		margin-top: 0.75rem;
		padding: 0.7rem;
		background: var(--nord8);
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
		background: var(--accent-dark);
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}
	.stat-label {
		font-size: 0.7rem;
		color: var(--nord4);
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
		color: var(--nord4);
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
		border-bottom: 1px solid var(--nord3, rgba(0,0,0,0.05));
		font-size: 0.85rem;
	}
	.body-label {
		color: var(--nord4);
	}
	.body-value {
		font-weight: 600;
	}

	@media (max-width: 480px) {
		.stat-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .measure-form,
		:global(:root:not([data-theme])) .stat-card {
			background: var(--nord5);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
		}
		:global(:root:not([data-theme])) .form-group input {
			background: var(--nord6, #eceff4);
		}
	}
	:global(:root[data-theme="light"]) .measure-form,
	:global(:root[data-theme="light"]) .stat-card {
		background: var(--nord5);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
	}
	:global(:root[data-theme="light"]) .form-group input {
		background: var(--nord6, #eceff4);
	}
</style>
