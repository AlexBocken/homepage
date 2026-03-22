<script>
	import { getExerciseById } from '$lib/data/exercises';
	import { EllipsisVertical } from 'lucide-svelte';
	import { page } from '$app/stores';
	import { detectFitnessLang, t } from '$lib/js/fitnessI18n';

	const lang = $derived(detectFitnessLang($page.url.pathname));

	/**
	 * @type {{
	 *   template: { _id: string, name: string, exercises: Array<{ exerciseId: string, sets: any[] }> },
	 *   lastUsed?: string | null,
	 *   onStart?: (() => void) | null,
	 *   onMenu?: ((e: MouseEvent) => void) | null
	 * }}
	 */
	let { template, lastUsed = null, onStart = null, onMenu = null } = $props();

	/** @param {string} dateStr */
	function formatDate(dateStr) {
		const d = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffDays = Math.floor(diffMs / 86400000);
		if (diffDays === 0) return t('today', lang);
		if (diffDays === 1) return t('yesterday', lang);
		if (diffDays < 7) return lang === 'en' ? `${diffDays} days ago` : `vor ${diffDays} Tagen`;
		return d.toLocaleDateString(lang === 'en' ? 'en' : 'de', { month: 'short', day: 'numeric' });
	}
</script>

<div class="template-card" role="button" tabindex="0" onclick={() => onStart?.()} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onStart?.(); }}}>
	<div class="card-header">
		<h3 class="card-title">{template.name}</h3>
		{#if onMenu}
			<button
				class="menu-btn"
				onclick={(e) => { e.stopPropagation(); onMenu?.(e); }}
				aria-label="Template options"
			>
				<EllipsisVertical size={16} />
			</button>
		{/if}
	</div>
	<ul class="exercise-preview">
		{#each template.exercises.slice(0, 4) as ex}
			{@const exercise = getExerciseById(ex.exerciseId)}
			<li>{ex.sets.length} &times; {exercise?.name ?? ex.exerciseId}</li>
		{/each}
		{#if template.exercises.length > 4}
			<li class="more">+{template.exercises.length - 4} {t('more', lang)}</li>
		{/if}
	</ul>
	{#if lastUsed}
		<p class="last-used">{t('last_performed', lang)} {formatDate(lastUsed)}</p>
	{/if}
</div>

<style>
	.template-card {
		display: flex;
		flex-direction: column;
		text-align: left;
		background: var(--color-surface);
		border: none;
		border-radius: 8px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
		cursor: pointer;
		transition: transform 150ms ease, box-shadow 150ms ease;
		width: 100%;
		font: inherit;
		color: inherit;
	}
	.template-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}
	.template-card:active {
		transform: translateY(0);
	}
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
	}
	.card-title {
		font-size: 0.95rem;
		font-weight: 700;
		margin: 0;
	}
	.menu-btn {
		background: none;
		border: none;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.15rem;
		border-radius: 4px;
	}
	.menu-btn:hover {
		color: var(--color-primary);
	}
	.exercise-preview {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.8rem;
		color: var(--color-text-secondary);
	}
	.exercise-preview li {
		padding: 0.1rem 0;
	}
	.exercise-preview .more {
		color: var(--color-primary);
		font-style: italic;
	}
	.last-used {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}
</style>
