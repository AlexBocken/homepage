<script>
	import { page } from '$app/stores';
	import { Pencil, Trash2, ChevronRight, Venus, Mars } from '@lucide/svelte';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';

	const lang = $derived(detectFitnessLang($page.url.pathname));
	const measureSlug = $derived(lang === 'en' ? 'measure' : 'messen');
	import { getWorkout } from '$lib/js/workout.svelte';
	import AddButton from '$lib/components/AddButton.svelte';
	import PeriodTracker from '$lib/components/fitness/PeriodTracker.svelte';

	let { data } = $props();
	const workout = getWorkout();

	let latest = $state(data.latest ? { ...data.latest } : {});
	let measurements = $state(data.measurements?.measurements ? [...data.measurements.measurements] : []);
	let showWeightHistory = $state(false);

	// Profile fields (sex, height, birth year) — stored in FitnessGoal
	let savedSex = $state(data.profile?.sex ?? 'male');
	let profileSex = $state(data.profile?.sex ?? 'male');
	let profileHeight = $state(data.profile?.heightCm != null ? String(data.profile.heightCm) : '');
	let profileBirthYear = $state(data.profile?.birthYear != null ? String(data.profile.birthYear) : '');
	let profileSaving = $state(false);
	let profileEditing = $state(false);

	const profileParts = $derived.by(() => {
		/** @type {string[]} */
		const parts = [];
		const h = data.profile?.heightCm;
		if (h) parts.push(`${h}cm`);
		const by = data.profile?.birthYear;
		if (by) parts.push(`*${by}`);
		return parts;
	});

	let profileDirty = $derived(
		profileSex !== (data.profile?.sex ?? 'male') ||
		profileHeight !== (data.profile?.heightCm != null ? String(data.profile.heightCm) : '') ||
		profileBirthYear !== (data.profile?.birthYear != null ? String(data.profile.birthYear) : '')
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
			const by = Number(profileBirthYear);
			if (by >= 1900 && by <= 2020) body.birthYear = by;
			const res = await fetch('/api/fitness/goal', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (res.ok) {
				const d = await res.json();
				data.profile = d;
				savedSex = d.sex ?? profileSex;
				profileEditing = false;
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
		return parts.join(' · ') || t('body_measurements_only', lang);
	}
</script>

<svelte:head><title>{lang === 'en' ? 'Measure' : 'Messen'} - Bocken</title></svelte:head>

<div class="measure-page">
	<div class="page-header">
		<h1>{t('measure_title', lang)}</h1>
		<div class="profile-meta">
			{#if data.profile?.sex}
				<span class="profile-sex-icon">
					{#if data.profile.sex === 'female'}
						<Venus size={16} />
					{:else}
						<Mars size={16} />
					{/if}
				</span>
			{/if}
			{#if profileParts.length > 0}
				<span class="profile-summary">{profileParts.join(' · ')}</span>
			{/if}
			<button class="profile-edit-btn" onclick={() => profileEditing = !profileEditing} aria-label="Edit profile">
				<Pencil size={12} />
			</button>
		</div>
	</div>

	{#if profileEditing}
		<div class="profile-fields">
			<div class="form-group">
				<label>{t('sex', lang)}</label>
				<div class="sex-pills">
					<button class="sex-pill" class:active={profileSex === 'male'} onclick={() => profileSex = 'male'}>
						<Mars size={14} /> {t('male', lang)}
					</button>
					<button class="sex-pill" class:active={profileSex === 'female'} onclick={() => profileSex = 'female'}>
						<Venus size={14} /> {t('female', lang)}
					</button>
				</div>
			</div>
			<div class="form-group">
				<label for="p-height">{t('height', lang)}</label>
				<input id="p-height" type="number" min="100" max="250" placeholder="175" bind:value={profileHeight} />
			</div>
			<div class="form-group">
				<label for="p-birthyear">{t('birth_year', lang)}</label>
				<input id="p-birthyear" type="number" min="1900" max="2020" placeholder="1990" bind:value={profileBirthYear} />
			</div>
			{#if profileDirty}
				<button class="profile-save-btn" onclick={saveProfile} disabled={profileSaving}>
					{profileSaving ? t('saving', lang) : t('save', lang)}
				</button>
			{/if}
		</div>
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
			<button class="history-toggle" onclick={() => showWeightHistory = !showWeightHistory}>
				<h2>{t('history', lang)}</h2>
				<ChevronRight size={14} class={showWeightHistory ? 'chevron open' : 'chevron'} />
			</button>
			{#if showWeightHistory}
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
			{/if}
		</section>
	{/if}

	{#if savedSex === 'female'}
		<PeriodTracker periods={data.periods ?? []} {lang} sharedWith={data.periodSharedWith ?? []} />
	{/if}

	{#each data.sharedPeriods ?? [] as shared (shared.owner)}
		<PeriodTracker periods={shared.entries} {lang} readOnly ownerName={shared.owner} />
	{/each}
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

	/* Header with inline profile */
	.page-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.profile-meta {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.profile-sex-icon {
		display: flex;
		color: var(--color-text-secondary);
	}
	.profile-summary {
		font-size: 0.8rem;
		color: var(--color-text-secondary);
		letter-spacing: 0.02em;
	}
	.profile-edit-btn {
		display: flex;
		align-items: center;
		padding: 0.25rem;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--color-text-tertiary);
		opacity: 0.6;
		transition: opacity 0.15s;
	}
	.profile-edit-btn:hover {
		opacity: 1;
		color: var(--color-text-secondary);
	}
	.profile-fields {
		display: flex;
		gap: 0.5rem;
		align-items: flex-end;
		justify-content: flex-end;
		flex-wrap: wrap;
	}
	.sex-pills {
		display: flex;
		gap: 0.4rem;
	}
	.sex-pill {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.65rem;
		border: 1px solid var(--color-border);
		border-radius: 20px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 150ms;
	}
	.sex-pill.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.profile-save-btn {
		padding: 0.4rem 0.75rem;
		background: var(--color-primary);
		color: var(--color-text-on-primary);
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
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		margin-bottom: 0.4rem;
		flex-shrink: 0;
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
		grid-template-columns: repeat(2, 1fr);
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
	.history-toggle {
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
	.history-toggle h2 {
		margin: 0;
		font-size: 1.1rem;
	}
	.history-toggle :global(.chevron) {
		transition: transform 0.2s;
	}
	.history-toggle :global(.chevron.open) {
		transform: rotate(90deg);
	}
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
