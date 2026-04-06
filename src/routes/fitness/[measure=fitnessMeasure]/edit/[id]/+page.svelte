<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import { Trash2 } from '@lucide/svelte';
	import SaveFab from '$lib/components/SaveFab.svelte';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const measureSlug = $derived(lang === 'en' ? 'measure' : 'messen');

	let { data } = $props();
	const m = data.measurement?.measurement;

	let saving = $state(false);
	let deleting = $state(false);

	// Populate form from loaded measurement
	let formDate = $state(m ? new Date(m.date).toISOString().slice(0, 10) : '');
	let formWeight = $state(m?.weight != null ? String(m.weight) : '');
	let formBodyFat = $state(m?.bodyFatPercent != null ? String(m.bodyFatPercent) : '');
	const bp = m?.measurements ?? {};
	let formNeck = $state(bp.neck != null ? String(bp.neck) : '');
	let formShoulders = $state(bp.shoulders != null ? String(bp.shoulders) : '');
	let formChest = $state(bp.chest != null ? String(bp.chest) : '');
	let formBicepsL = $state((bp.biceps?.left ?? bp.leftBicep) != null ? String(bp.biceps?.left ?? bp.leftBicep) : '');
	let formBicepsR = $state((bp.biceps?.right ?? bp.rightBicep) != null ? String(bp.biceps?.right ?? bp.rightBicep) : '');
	let formForearmsL = $state((bp.forearms?.left ?? bp.leftForearm) != null ? String(bp.forearms?.left ?? bp.leftForearm) : '');
	let formForearmsR = $state((bp.forearms?.right ?? bp.rightForearm) != null ? String(bp.forearms?.right ?? bp.rightForearm) : '');
	let formWaist = $state(bp.waist != null ? String(bp.waist) : '');
	let formHips = $state(bp.hips != null ? String(bp.hips) : '');
	let formThighsL = $state((bp.thighs?.left ?? bp.leftThigh) != null ? String(bp.thighs?.left ?? bp.leftThigh) : '');
	let formThighsR = $state((bp.thighs?.right ?? bp.rightThigh) != null ? String(bp.thighs?.right ?? bp.rightThigh) : '');
	let formCalvesL = $state((bp.calves?.left ?? bp.leftCalf) != null ? String(bp.calves?.left ?? bp.leftCalf) : '');
	let formCalvesR = $state((bp.calves?.right ?? bp.rightCalf) != null ? String(bp.calves?.right ?? bp.rightCalf) : '');

	function buildBody() {
		/** @type {any} */
		const body = { date: formDate };
		if (formWeight) body.weight = Number(formWeight);
		else body.weight = null;
		if (formBodyFat) body.bodyFatPercent = Number(formBodyFat);
		else body.bodyFatPercent = null;
		/** @type {any} */
		const ms = {};
		if (formNeck) ms.neck = Number(formNeck);
		if (formShoulders) ms.shoulders = Number(formShoulders);
		if (formChest) ms.chest = Number(formChest);
		if (formBicepsL || formBicepsR) ms.biceps = {};
		if (formBicepsL) ms.biceps.left = Number(formBicepsL);
		if (formBicepsR) ms.biceps.right = Number(formBicepsR);
		if (formForearmsL || formForearmsR) ms.forearms = {};
		if (formForearmsL) ms.forearms.left = Number(formForearmsL);
		if (formForearmsR) ms.forearms.right = Number(formForearmsR);
		if (formWaist) ms.waist = Number(formWaist);
		if (formHips) ms.hips = Number(formHips);
		if (formThighsL || formThighsR) ms.thighs = {};
		if (formThighsL) ms.thighs.left = Number(formThighsL);
		if (formThighsR) ms.thighs.right = Number(formThighsR);
		if (formCalvesL || formCalvesR) ms.calves = {};
		if (formCalvesL) ms.calves.left = Number(formCalvesL);
		if (formCalvesR) ms.calves.right = Number(formCalvesR);

		body.measurements = Object.keys(ms).length > 0 ? ms : null;
		return body;
	}

	async function saveMeasurement() {
		saving = true;
		try {
			const res = await fetch(`/api/fitness/measurements/${m._id}`, {
				method: 'PUT',
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

	async function deleteMeasurement() {
		if (!confirm(t('delete_measurement_confirm', lang))) return;
		deleting = true;
		try {
			const res = await fetch(`/api/fitness/measurements/${m._id}`, { method: 'DELETE' });
			if (res.ok) {
				await goto(`/fitness/${measureSlug}`);
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to delete measurement');
			}
		} catch { toast.error('Failed to delete measurement'); }
		deleting = false;
	}
</script>

<svelte:head><title>{t('edit_measurement', lang)} - Bocken</title></svelte:head>

<div class="measure-edit">
	<h1>{t('edit_measurement', lang)}</h1>

	{#if !m}
		<p>Measurement not found.</p>
	{:else}
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

			<div class="delete-actions">
				<button type="button" class="btn-danger" onclick={deleteMeasurement} disabled={deleting || saving}>
					<Trash2 size={14} />
					{deleting ? t('saving', lang) : t('delete_', lang)}
				</button>
			</div>

			<SaveFab disabled={saving || deleting} label={t('update_measurement', lang)} />
		</form>
	{/if}
</div>

<style>
	.measure-edit {
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
	.delete-actions {
		margin-top: 1rem;
	}
	.btn-danger {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1rem;
		background: var(--red);
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.85rem;
		cursor: pointer;
	}
	.btn-danger:hover:not(:disabled) {
		background: var(--nord11);
	}
	.btn-danger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (max-width: 480px) {
		.form-row {
			flex-direction: column;
		}
	}
</style>
