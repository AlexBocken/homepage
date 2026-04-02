<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import SaveFab from '$lib/components/SaveFab.svelte';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const measureSlug = $derived(lang === 'en' ? 'measure' : 'messen');

	let saving = $state(false);

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

	async function saveMeasurement() {
		saving = true;
		try {
			const res = await fetch('/api/fitness/measurements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildBody())
			});
			if (res.ok) {
				await goto(`/fitness/${measureSlug}`);
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to save measurement');
			}
		} catch { toast.error('Failed to save measurement'); }
		saving = false;
	}
</script>

<svelte:head><title>{t('new_measurement', lang)} - Bocken</title></svelte:head>

<div class="measure-add">
	<h1>{t('new_measurement', lang)}</h1>

	<form onsubmit={(e) => { e.preventDefault(); saveMeasurement(); }}>
		<div class="form-group">
			<label for="m-date">{t('date', lang)}</label>
			<input id="m-date" type="date" bind:value={formDate} />
		</div>

		<h3>{t('general', lang)}</h3>
		<div class="form-row">
			<div class="form-group">
				<label for="m-weight">{t('weight_kg', lang)}</label>
				<input id="m-weight" type="number" step="0.1" bind:value={formWeight} placeholder="--" />
			</div>
			<div class="form-group">
				<label for="m-bf">{t('body_fat_pct', lang)}</label>
				<input id="m-bf" type="number" step="0.1" bind:value={formBodyFat} placeholder="--" />
			</div>
			<div class="form-group">
				<label for="m-cal">{t('calories_kcal', lang)}</label>
				<input id="m-cal" type="number" bind:value={formCalories} placeholder="--" />
			</div>
		</div>

		<h3>{t('body_parts_cm', lang)}</h3>
		<div class="form-row">
			<div class="form-group"><label for="m-neck">{t('neck', lang)}</label><input id="m-neck" type="number" step="0.1" bind:value={formNeck} placeholder="--" /></div>
			<div class="form-group"><label for="m-shoulders">{t('shoulders', lang)}</label><input id="m-shoulders" type="number" step="0.1" bind:value={formShoulders} placeholder="--" /></div>
			<div class="form-group"><label for="m-chest">{t('chest', lang)}</label><input id="m-chest" type="number" step="0.1" bind:value={formChest} placeholder="--" /></div>
		</div>
		<div class="form-row">
			<div class="form-group"><label for="m-bl">{t('l_bicep', lang)}</label><input id="m-bl" type="number" step="0.1" bind:value={formBicepsL} placeholder="--" /></div>
			<div class="form-group"><label for="m-br">{t('r_bicep', lang)}</label><input id="m-br" type="number" step="0.1" bind:value={formBicepsR} placeholder="--" /></div>
		</div>
		<div class="form-row">
			<div class="form-group"><label for="m-fl">{t('l_forearm', lang)}</label><input id="m-fl" type="number" step="0.1" bind:value={formForearmsL} placeholder="--" /></div>
			<div class="form-group"><label for="m-fr">{t('r_forearm', lang)}</label><input id="m-fr" type="number" step="0.1" bind:value={formForearmsR} placeholder="--" /></div>
		</div>
		<div class="form-row">
			<div class="form-group"><label for="m-waist">{t('waist', lang)}</label><input id="m-waist" type="number" step="0.1" bind:value={formWaist} placeholder="--" /></div>
			<div class="form-group"><label for="m-hips">{t('hips', lang)}</label><input id="m-hips" type="number" step="0.1" bind:value={formHips} placeholder="--" /></div>
		</div>
		<div class="form-row">
			<div class="form-group"><label for="m-tl">{t('l_thigh', lang)}</label><input id="m-tl" type="number" step="0.1" bind:value={formThighsL} placeholder="--" /></div>
			<div class="form-group"><label for="m-tr">{t('r_thigh', lang)}</label><input id="m-tr" type="number" step="0.1" bind:value={formThighsR} placeholder="--" /></div>
		</div>
		<div class="form-row">
			<div class="form-group"><label for="m-cl">{t('l_calf', lang)}</label><input id="m-cl" type="number" step="0.1" bind:value={formCalvesL} placeholder="--" /></div>
			<div class="form-group"><label for="m-cr">{t('r_calf', lang)}</label><input id="m-cr" type="number" step="0.1" bind:value={formCalvesR} placeholder="--" /></div>
		</div>

		<SaveFab disabled={saving} label={t('save_measurement', lang)} />
	</form>
</div>

<style>
	.measure-add {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
	}
	h3 {
		margin: 0.75rem 0 0.25rem;
		font-size: 0.85rem;
		color: var(--color-text-secondary);
	}
	form {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
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

	@media (max-width: 480px) {
		.form-row {
			flex-direction: column;
		}
	}
</style>
