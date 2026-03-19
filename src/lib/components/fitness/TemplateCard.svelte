<script>
	import { getExerciseById } from '$lib/data/exercises';
	import { EllipsisVertical } from 'lucide-svelte';

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
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays} days ago`;
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
</script>

<button class="template-card" onclick={() => onStart?.()}>
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
			<li class="more">+{template.exercises.length - 4} more</li>
		{/if}
	</ul>
	{#if lastUsed}
		<p class="last-used">Last performed: {formatDate(lastUsed)}</p>
	{/if}
</button>

<style>
	.template-card {
		display: flex;
		flex-direction: column;
		text-align: left;
		background: var(--accent-dark);
		border: none;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		padding: 1rem;
		cursor: pointer;
		transition: transform 150ms ease, box-shadow 150ms ease;
		width: 100%;
		font: inherit;
		color: inherit;
	}
	.template-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
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
		color: var(--nord4);
		cursor: pointer;
		padding: 0.15rem;
		border-radius: 4px;
	}
	.menu-btn:hover {
		color: var(--nord8);
	}
	.exercise-preview {
		list-style: none;
		padding: 0;
		margin: 0;
		font-size: 0.8rem;
		color: var(--nord4);
	}
	.exercise-preview li {
		padding: 0.1rem 0;
	}
	.exercise-preview .more {
		color: var(--nord8);
		font-style: italic;
	}
	.last-used {
		margin: 0.5rem 0 0;
		font-size: 0.75rem;
		color: var(--nord4);
	}

	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .template-card {
			background: var(--nord5);
			box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
		}
	}
	:global(:root[data-theme="light"]) .template-card {
		background: var(--nord5);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
	}
</style>
