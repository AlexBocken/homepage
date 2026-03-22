<script>
import { goto } from '$app/navigation';
import { Play, Pause } from 'lucide-svelte';
import SyncIndicator from '$lib/components/fitness/SyncIndicator.svelte';
import { page } from '$app/stores';
import { detectFitnessLang, t } from '$lib/js/fitnessI18n';

const lang = $derived(detectFitnessLang($page.url.pathname));

let { href, elapsed = '0:00', paused = false, syncStatus = 'idle', onPauseToggle,
	restSeconds = 0, restTotal = 0, onRestAdjust = null, onRestSkip = null } = $props();

/** @param {number} secs */
function formatRest(secs) {
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return `${m}:${s.toString().padStart(2, '0')}`;
}

const restProgress = $derived(restTotal > 0 ? restSeconds / restTotal : 0);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="workout-bar" onclick={() => goto(href)} onkeydown={(e) => { if (e.key === 'Enter') goto(href); }}>
	<div class="bar-left">
		<button class="pause-btn" onclick={(e) => { e.stopPropagation(); onPauseToggle?.(); }} aria-label={paused ? 'Resume' : 'Pause'}>
			{#if paused}<Play size={16} />{:else}<Pause size={16} />{/if}
		</button>
		<span class="elapsed" class:paused>{elapsed}</span>
		<SyncIndicator status={syncStatus} />
	</div>
	{#if restTotal > 0 && restSeconds > 0}
		<div class="rest-pill" onclick={(e) => e.stopPropagation()}>
			<div class="rest-fill" style:width="{restProgress * 100}%"></div>
			<div class="rest-controls">
				<button class="rest-adj" onclick={() => onRestAdjust?.(-30)}>-30s</button>
				<button class="rest-time" onclick={() => onRestSkip?.()}>{formatRest(restSeconds)}</button>
				<button class="rest-adj" onclick={() => onRestAdjust?.(30)}>+30s</button>
			</div>
		</div>
	{:else}
		<span class="bar-label">{t('active_workout', lang)}</span>
	{/if}
</div>

<style>
	.workout-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 900px;
		margin: 0 auto;
		padding: 0.75rem var(--space-md, 1rem);
		background: var(--color-bg-primary);
		border-top: 1px solid var(--color-border);
		z-index: 100;
		cursor: pointer;
	}
	.bar-left {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.pause-btn {
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 6px;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0.3rem;
		display: flex;
		align-items: center;
	}
	.pause-btn:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}
	.elapsed {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
		font-size: 1.1rem;
		color: var(--color-text-secondary);
	}
	.elapsed.paused {
		color: var(--nord13);
	}
	.bar-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.rest-pill {
		position: relative;
		height: 2rem;
		border-radius: 8px;
		overflow: hidden;
		background: var(--color-bg-elevated);
		min-width: 10rem;
	}
	.rest-fill {
		position: absolute;
		inset: 0;
		background: var(--color-primary);
		border-radius: 8px;
		transition: width 1s linear;
	}
	.rest-controls {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		z-index: 1;
	}
	.rest-time {
		background: none;
		border: none;
		font-size: 0.85rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-primary, inherit);
		cursor: pointer;
		padding: 0.2rem 0.4rem;
	}
	.rest-adj {
		background: none;
		border: none;
		color: var(--color-text-primary, inherit);
		cursor: pointer;
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.2rem 0.3rem;
		border-radius: 4px;
		opacity: 0.7;
	}
	.rest-adj:hover {
		opacity: 1;
	}
	@media (prefers-color-scheme: dark) {
		.rest-time, .rest-adj {
			color: var(--nord10);
		}
	}
	:global(:root[data-theme="dark"]) .rest-time,
	:global(:root[data-theme="dark"]) .rest-adj {
		color: var(--nord10);
	}
</style>
