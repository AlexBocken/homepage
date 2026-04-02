<script>
	import { page } from '$app/stores';
	import { Pencil, Trash2, ChevronDown } from 'lucide-svelte';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const measureSlug = $derived(lang === 'en' ? 'measure' : 'messen');
	import { getWorkout } from '$lib/js/workout.svelte';
	import AddButton from '$lib/components/AddButton.svelte';

	let { data } = $props();
	const workout = getWorkout();

	let latest = $state(data.latest ? { ...data.latest } : {});
	let measurements = $state(data.measurements?.measurements ? [...data.measurements.measurements] : []);

	// Profile fields (sex, height) — stored in FitnessGoal
	let showProfile = $state(false);
	let profileSex = $state(data.profile?.sex ?? 'male');
	let profileHeight = $state(data.profile?.heightCm != null ? String(data.profile.heightCm) : '');
	let profileSaving = $state(false);
	let profileDirty = $derived(
		profileSex !== (data.profile?.sex ?? 'male') ||
		profileHeight !== (data.profile?.heightCm != null ? String(data.profile.heightCm) : '')
	);

	async function saveProfile() {
		profileSaving = true;
		try {
			/** @type {Record<string, unknown>} */
			const body = {
				weeklyWorkouts: data.profile?.weeklyWorkouts ?? 4,
				sex: profileSex
			};
			const h = Number(profileHeight);
			if (h >= 100 && h <= 250) body.heightCm = h;
			const res = await fetch('/api/fitness/goal', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				const d = await res.json();
				data.profile = d;
			}
		} finally {
			profileSaving = false;
		}
	}

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

	/** @param {string} id */
	async function deleteMeasurement(id) {
		if (!confirm(t('delete_measurement_confirm', lang))) return;
		try {
			const res = await fetch(`/api/fitness/measurements/${id}`, { method: 'DELETE' });
			if (res.ok) {
				measurements = measurements.filter((m) => m._id !== id);
				try {
					const latestRes = await fetch('/api/fitness/measurements/latest');
					if (latestRes.ok) latest = await latestRes.json();
				} catch {}
			} else {
				const err = await res.json().catch(() => null);
				toast.error(err?.error ?? 'Failed to delete measurement');
			}
		} catch { toast.error('Failed to delete measurement'); }
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

<svelte:head><title>{lang === 'en' ? 'Measure' : 'Messen'} - Bocken</title></svelte:head>

<div class="measure-page">
	<h1>{t('measure_title', lang)}</h1>

	<section class="profile-section">
		<button class="profile-toggle" onclick={() => showProfile = !showProfile}>
			<h2>{t('profile', lang)}</h2>
			<ChevronDown size={16} class={showProfile ? 'chevron open' : 'chevron'} />
		</button>
		{#if showProfile}
			<div class="profile-row">
				<div class="form-group">
					<label for="p-sex">{t('sex', lang)}</label>
					<select id="p-sex" bind:value={profileSex}>
						<option value="male">{t('male', lang)}</option>
						<option value="female">{t('female', lang)}</option>
					</select>
				</div>
				<div class="form-group">
					<label for="p-height">{t('height', lang)}</label>
					<input id="p-height" type="number" min="100" max="250" placeholder="175" bind:value={profileHeight} />
				</div>
				{#if profileDirty}
					<button class="profile-save-btn" onclick={saveProfile} disabled={profileSaving}>
						{profileSaving ? t('saving', lang) : t('save', lang)}
					</button>
				{/if}
			</div>
		{/if}
	</section>

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
					<div class="history-item">
						<div class="history-main">
							<div class="history-info">
								<span class="history-date">{formatDate(m.date)}</span>
								<span class="history-summary">{summaryParts(m)}</span>
							</div>
							<div class="history-actions">
								<a class="icon-btn edit" href="/fitness/{measureSlug}/edit/{m._id}" aria-label="Edit measurement">
									<Pencil size={14} />
								</a>
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
	<AddButton href="/fitness/{measureSlug}/add" />
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
	/* Profile */
	.profile-section {
		background: var(--color-surface);
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 0.75rem 1rem;
	}
	.profile-toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		color: inherit;
	}
	.profile-toggle h2 {
		margin: 0;
		font-size: 0.9rem;
	}
	.profile-toggle :global(.chevron) {
		transition: transform 0.2s;
	}
	.profile-toggle :global(.chevron.open) {
		transform: rotate(180deg);
	}
	.profile-section h2 {
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
	}
	.profile-row {
		display: flex;
		gap: 0.75rem;
		align-items: flex-end;
		margin-top: 0.5rem;
	}
	.profile-save-btn {
		padding: 0.4rem 0.75rem;
		background: var(--color-primary);
		color: white;
		border: none;
		border-radius: 6px;
		font-weight: 600;
		font-size: 0.8rem;
		cursor: pointer;
		white-space: nowrap;
		align-self: flex-end;
		margin-bottom: 0.4rem;
	}
	.profile-save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
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
	.form-group input, .form-group select {
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
	}
</style>
