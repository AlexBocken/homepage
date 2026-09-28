<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { detectFitnessLang, m as messages } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import SaveFab from '$lib/components/SaveFab.svelte';
	import DatePicker from '$lib/components/DatePicker.svelte';
	import { BODY_PART_CARDS } from '$lib/js/fitnessBodyParts';

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(messages[lang]);
	const checkinSlug = $derived(lang === 'en' ? 'check-in' : 'erfassung');

	let { data } = $props();
	// svelte-ignore state_referenced_locally
	const m = data.measurement?.measurement;

	let saving = $state(false);
	let deleting = $state(false);

	// Populate form from loaded measurement
	let formDate = $state(m ? new Date(m.date).toISOString().slice(0, 10) : '');
	let formWeight = $state(m?.weight != null ? String(m.weight) : '');
	let formBodyFat = $state(m?.bodyFatPercent != null ? String(m.bodyFatPercent) : '');
	/** @typedef {{ db: string, id: string, label: import('$lib/js/fitnessI18n').FitnessKey }} Field */

	/**
	 * The form's rows: the single body parts that follow each other share one, each
	 * paired part gets its own (left, then right). Flattened, this is also the key
	 * order of the posted `measurements`.
	 * @type {Field[][]}
	 */
	const ROWS = [];
	for (const [i, c] of BODY_PART_CARDS.entries()) {
		if (c.paired) {
			ROWS.push([
				{ db: c.dbLeft, id: `m-${c.key[0]}l`, label: c.labelLeft },
				{ db: c.dbRight, id: `m-${c.key[0]}r`, label: c.labelRight }
			]);
		} else {
			const field = { db: c.db, id: `m-${c.key}`, label: c.labelKey };
			if (i > 0 && !BODY_PART_CARDS[i - 1].paired) ROWS[ROWS.length - 1].push(field);
			else ROWS.push([field]);
		}
	}
	const FIELDS = ROWS.flat();

	const bp = m?.measurements ?? {};
	/** @type {Record<string, string>} */
	let formParts = $state(Object.fromEntries(FIELDS.map((f) => [f.db, bp[f.db] != null ? String(bp[f.db]) : ''])));

	function buildBody() {
		/** @type {any} */
		const body = { date: formDate };
		if (formWeight) body.weight = Number(formWeight);
		else body.weight = null;
		if (formBodyFat) body.bodyFatPercent = Number(formBodyFat);
		else body.bodyFatPercent = null;
		/** @type {any} */
		const ms = {};
		for (const f of FIELDS) {
			if (formParts[f.db]) ms[f.db] = Number(formParts[f.db]);
		}

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
				await goto(`/fitness/${checkinSlug}`);
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to save measurement');
			}
		} catch { toast.error('Failed to save measurement'); }
		saving = false;
	}

	async function deleteMeasurement() {
		if (!await confirm(t.delete_measurement_confirm, {
			confirmText: t.action_delete,
			cancelText: t.action_cancel,
		})) return;
		deleting = true;
		try {
			const res = await fetch(`/api/fitness/measurements/${m._id}`, { method: 'DELETE' });
			if (res.ok) {
				await goto(`/fitness/${checkinSlug}`);
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to delete measurement');
			}
		} catch { toast.error('Failed to delete measurement'); }
		deleting = false;
	}
</script>

<svelte:head><title>{t.edit_measurement} - Bocken</title></svelte:head>

<div class="measure-edit">
	<h1>{t.edit_measurement}</h1>

	{#if !m}
		<p>Measurement not found.</p>
	{:else}
		<form onsubmit={(e) => { e.preventDefault(); saveMeasurement(); }}>
			<div class="form-group">
				<label for="m-date">{t.date}</label>
				<DatePicker bind:value={formDate} {lang} />
			</div>

			<h3>{t.general}</h3>
			<div class="form-row">
				<div class="form-group">
					<label for="m-weight">{t.weight_kg}</label>
					<input id="m-weight" type="number" step="0.1" bind:value={formWeight} placeholder="--" />
				</div>
				<div class="form-group">
					<label for="m-bf">{t.body_fat_pct}</label>
					<input id="m-bf" type="number" step="0.1" bind:value={formBodyFat} placeholder="--" />
				</div>
			</div>

			<h3>{t.body_parts_cm}</h3>
			{#each ROWS as row, r (r)}
				<div class="form-row">
					{#each row as f (f.db)}
						<div class="form-group"><label for={f.id}>{t[f.label]}</label><input id={f.id} type="number" step="0.1" bind:value={formParts[f.db]} placeholder="--" /></div>
					{/each}
				</div>
			{/each}

			<div class="delete-actions">
				<button type="button" class="btn-danger" onclick={deleteMeasurement} disabled={deleting || saving}>
					<Trash2 size={14} />
					{deleting ? t.saving : t.delete_}
				</button>
			</div>

			<SaveFab disabled={saving || deleting} label={t.update_measurement} />
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
		background: var(--red);
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
