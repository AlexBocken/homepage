<script>
import { goto } from '$app/navigation';
import Play from '@lucide/svelte/icons/play';
import Pause from '@lucide/svelte/icons/pause';
import ChevronRight from '@lucide/svelte/icons/chevron-right';
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

const restActive = $derived(restTotal > 0 && restSeconds > 0);
const restProgress = $derived(restTotal > 0 ? restSeconds / restTotal : 0);
</script>

<div
	class="workout-fab"
	class:rest-active={restActive}
	role="button"
	tabindex="0"
	aria-label={t('active_workout', lang)}
	onclick={() => goto(href)}
	onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goto(href); } }}
>
	<button
		class="pause-btn"
		onclick={(e) => { e.stopPropagation(); onPauseToggle?.(); }}
		aria-label={paused ? 'Resume' : 'Pause'}
	>
		{#if paused}<Play size={14} strokeWidth={2.4} />{:else}<Pause size={14} strokeWidth={2.4} />{/if}
	</button>

	<span class="elapsed" class:paused>{elapsed}</span>

	<span class="fab-sync"><SyncIndicator status={syncStatus} /></span>

	<span class="fab-divider" aria-hidden="true"></span>

	{#if restActive}
		<div class="rest-pill">
			<div class="rest-fill" style:width="{restProgress * 100}%" aria-hidden="true"></div>
			<button class="rest-adj" onclick={(e) => { e.stopPropagation(); onRestAdjust?.(-30); }} aria-label="Remove 30 seconds">−30s</button>
			<button class="rest-time" onclick={(e) => { e.stopPropagation(); onRestSkip?.(); }} aria-label="Skip rest">{formatRest(restSeconds)}</button>
			<button class="rest-adj" onclick={(e) => { e.stopPropagation(); onRestAdjust?.(30); }} aria-label="Add 30 seconds">+30s</button>
		</div>
	{:else}
		<span class="fab-label">{t('active_workout', lang)}</span>
		<ChevronRight size={14} strokeWidth={2.4} class="fab-chevron" />
	{/if}
</div>

<style>
	/* ═══════════════════════════════════════════
	   FLOATING GLASS PILL — mirrors Header.svelte nav
	   ═══════════════════════════════════════════ */
	.workout-fab {
		position: fixed;
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		left: 0;
		right: 0;
		z-index: 100;

		display: flex;
		align-items: center;
		gap: 0.5rem;
		height: 3rem;
		padding: 0 0.45rem 0 0.45rem;

		width: -moz-fit-content;
		width: fit-content;
		max-width: calc(100% - 1.5rem);
		margin-inline: auto;

		border-radius: 100px;
		background: var(--fab-bg, rgba(46, 52, 64, 0.82));
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border: 1px solid var(--fab-border, rgba(255, 255, 255, 0.08));
		box-shadow: 0 4px 24px var(--fab-shadow, rgba(0, 0, 0, 0.25));

		cursor: pointer;
		transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1),
		            box-shadow 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
		animation: fab-rise 380ms cubic-bezier(0.2, 0.8, 0.2, 1) both;

		/* token defaults (dark bar) */
		--fab-text: #c9c9c9;
		--fab-text-strong: #fff;
		--fab-text-muted: rgba(255, 255, 255, 0.55);
		--fab-btn-bg: rgba(255, 255, 255, 0.08);
		--fab-btn-bg-hover: rgba(255, 255, 255, 0.16);
		--fab-btn-border: rgba(255, 255, 255, 0.14);
		--fab-divider: rgba(255, 255, 255, 0.12);
		--fab-accent: var(--blue, #5e81ac);
		--fab-paused: var(--nord13, #ebcb8b);
	}

	.workout-fab:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 28px var(--fab-shadow, rgba(0, 0, 0, 0.35));
	}
	.workout-fab:active {
		transform: translateY(0);
	}

	@media (prefers-color-scheme: dark) {
		.workout-fab {
			--fab-bg: rgba(20, 20, 20, 0.78);
			--fab-border: rgba(255, 255, 255, 0.06);
		}
	}
	:global(:root[data-theme="dark"]) .workout-fab {
		--fab-bg: rgba(20, 20, 20, 0.78);
		--fab-border: rgba(255, 255, 255, 0.06);
	}

	/* Light theme */
	:global(:root[data-theme="light"]) .workout-fab {
		--fab-bg: rgba(255, 255, 255, 0.82);
		--fab-border: rgba(0, 0, 0, 0.08);
		--fab-shadow: rgba(0, 0, 0, 0.1);
		--fab-text: #555;
		--fab-text-strong: var(--nord0, #2e3440);
		--fab-text-muted: rgba(0, 0, 0, 0.5);
		--fab-btn-bg: rgba(0, 0, 0, 0.05);
		--fab-btn-bg-hover: rgba(0, 0, 0, 0.1);
		--fab-btn-border: rgba(0, 0, 0, 0.12);
		--fab-divider: rgba(0, 0, 0, 0.1);
	}
	@media (prefers-color-scheme: light) {
		:global(:root:not([data-theme])) .workout-fab {
			--fab-bg: rgba(255, 255, 255, 0.82);
			--fab-border: rgba(0, 0, 0, 0.08);
			--fab-shadow: rgba(0, 0, 0, 0.1);
			--fab-text: #555;
			--fab-text-strong: var(--nord0, #2e3440);
			--fab-text-muted: rgba(0, 0, 0, 0.5);
			--fab-btn-bg: rgba(0, 0, 0, 0.05);
			--fab-btn-bg-hover: rgba(0, 0, 0, 0.1);
			--fab-btn-border: rgba(0, 0, 0, 0.12);
			--fab-divider: rgba(0, 0, 0, 0.1);
		}
	}

	/* ═══════════════════════════════════════════
	   PAUSE BUTTON — small pill icon button (matches nav hover tile)
	   ═══════════════════════════════════════════ */
	.pause-btn {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 100px;
		background: var(--fab-btn-bg);
		border: 1px solid var(--fab-btn-border);
		color: var(--fab-text-strong);
		cursor: pointer;
		padding: 0;
		transition: background 140ms, color 140ms, transform 120ms;
	}
	.pause-btn:hover {
		background: var(--fab-btn-bg-hover);
		color: var(--fab-accent);
	}
	.pause-btn:active {
		transform: scale(0.94);
	}

	/* ═══════════════════════════════════════════
	   ELAPSED TIME — dominant numeric
	   ═══════════════════════════════════════════ */
	.elapsed {
		flex-shrink: 0;
		font-variant-numeric: tabular-nums;
		font-weight: 700;
		font-size: 1.05rem;
		letter-spacing: 0.01em;
		color: var(--fab-text-strong);
		padding-inline: 0.15rem;
	}
	.elapsed.paused {
		color: var(--fab-paused);
	}

	.fab-sync {
		display: inline-flex;
		align-items: center;
		color: var(--fab-text-muted);
	}

	.fab-divider {
		width: 1px;
		height: 1.2rem;
		background: var(--fab-divider);
		flex-shrink: 0;
	}

	/* ═══════════════════════════════════════════
	   RIGHT-SIDE LABEL / CHEVRON — idle state
	   ═══════════════════════════════════════════ */
	.fab-label {
		flex-shrink: 0;
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--fab-text);
		padding-right: 0.15rem;
	}

	.workout-fab :global(.fab-chevron) {
		color: var(--fab-text-muted);
		margin-right: 0.35rem;
		transition: transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), color 140ms;
	}
	.workout-fab:hover :global(.fab-chevron) {
		color: var(--fab-text-strong);
		transform: translateX(3px);
	}

	/* ═══════════════════════════════════════════
	   REST PILL — inner pill with animated progress fill
	   ═══════════════════════════════════════════ */
	.rest-pill {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		height: 2.1rem;
		padding: 0 0.25rem;
		border-radius: 100px;
		background: var(--fab-btn-bg);
		overflow: hidden;
		isolation: isolate;
	}
	.rest-fill {
		position: absolute;
		inset: 0;
		right: auto;
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--fab-accent), transparent 55%) 0%,
			var(--fab-accent) 100%
		);
		transition: width 1s linear;
		z-index: -1;
	}
	.rest-time,
	.rest-adj {
		appearance: none;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--fab-text-strong);
		font-family: inherit;
		padding: 0.25rem 0.5rem;
		border-radius: 100px;
		transition: background 120ms;
	}
	.rest-time {
		font-size: 0.9rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.01em;
		min-width: 3.2rem;
		text-align: center;
	}
	.rest-adj {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		opacity: 0.85;
	}
	.rest-time:hover,
	.rest-adj:hover {
		background: rgba(255, 255, 255, 0.14);
		opacity: 1;
	}
	:global(:root[data-theme="light"]) .rest-time:hover,
	:global(:root[data-theme="light"]) .rest-adj:hover {
		background: rgba(255, 255, 255, 0.5);
	}

	/* ═══════════════════════════════════════════
	   MOUNT ANIMATION
	   ═══════════════════════════════════════════ */
	@keyframes fab-rise {
		from {
			opacity: 0;
			transform: translateY(24px) scale(0.96);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* ═══════════════════════════════════════════
	   NARROW SCREENS — tighten spacing
	   ═══════════════════════════════════════════ */
	@media (max-width: 420px) {
		.workout-fab {
			gap: 0.4rem;
			padding: 0 0.35rem;
		}
		.fab-label {
			font-size: 0.62rem;
			letter-spacing: 0.08em;
		}
		.elapsed {
			font-size: 0.95rem;
		}
		.rest-pill {
			gap: 0.1rem;
		}
		.rest-adj {
			padding: 0.25rem 0.35rem;
			font-size: 0.62rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.workout-fab {
			animation: none;
		}
		.workout-fab:hover {
			transform: none;
		}
	}
</style>
