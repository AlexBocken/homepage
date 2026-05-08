<script>
	import { onMount, onDestroy } from 'svelte';
	import { resolve } from '$app/paths';
	import { invalidateAll } from '$app/navigation';
	import { page as appPage } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import SessionCard from '$lib/components/fitness/SessionCard.svelte';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import { getQueuedSessions } from '$lib/offline/fitnessQueue';

	const lang = $derived(detectFitnessLang(appPage.url.pathname));
	const t = $derived(m[lang]);
	const s = $derived(fitnessSlugs(lang));

	let { data } = $props();

	/** @type {Array<{ _id: string, name: string, startTime: string, exercises: any[], duration?: number, totalVolume?: number, totalDistance?: number, prs?: any[], kcalEstimate?: any }>} */
	let queuedSessions = $state([]);

	async function loadQueued() {
		try {
			const entries = await getQueuedSessions();
			queuedSessions = entries.map(e => {
				const d = /** @type {any} */ (e.data);
				// Server normally computes duration from start/end; do it locally
				// so the unsynced card shows the same Clock stat as synced ones.
				const duration = d.startTime && d.endTime
					? Math.max(0, Math.round((new Date(d.endTime).getTime() - new Date(d.startTime).getTime()) / 60000))
					: undefined;
				return /** @type {any} */ ({
					...d,
					_id: `queued-${e.id}`,
					duration,
				});
			});
		} catch (err) {
			console.error('Failed to load queued workouts:', err);
		}
	}

	async function onOnline() {
		// The layout's online listener triggers flushQueue; give it a moment to
		// finish, then refresh both the queue display and server-side sessions.
		setTimeout(async () => {
			await loadQueued();
			await invalidateAll();
		}, 1500);
	}

	onMount(() => {
		loadQueued();
		window.addEventListener('online', onOnline);
	});

	onDestroy(() => {
		if (typeof window !== 'undefined') window.removeEventListener('online', onOnline);
	});

	/** Server sessions for the active view */
	const serverSessions = $derived(data.sessions?.sessions ?? []);
	const viewMonth = $derived(data.month); // YYYY-MM or null

	/** Queued sessions filtered to the current view month (or shown on the recent view) */
	const visibleQueued = $derived.by(() => {
		if (!viewMonth) return queuedSessions; // recent view shows everything pending
		return queuedSessions.filter(q => {
			const d = new Date(q.startTime);
			const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			return ym === viewMonth;
		});
	});

	/** Merged list, queued sessions first (newest unsynced on top) */
	const sessions = $derived([...visibleQueued, ...serverSessions].sort(
		(a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
	));
	const queuedIds = $derived(new Set(visibleQueued.map(q => q._id)));

	/** @type {Record<string, typeof sessions>} */
	const grouped = $derived.by(() => {
		/** @type {Record<string, typeof sessions>} */
		const groups = {};
		for (const sess of sessions) {
			const d = new Date(sess.startTime);
			const key = `${d.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'long' })} ${d.getFullYear()}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(sess);
		}
		return groups;
	});

	// Month navigation
	function offsetMonth(/** @type {string} */ ym, /** @type {number} */ delta) {
		const [y, m] = ym.split('-').map(Number);
		const d = new Date(y, m - 1 + delta, 1);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
	}

	const now = new Date();
	const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

	// When viewing a specific month, show prev/next; when default, show "older" link
	const baseMonth = $derived(viewMonth ?? currentYM);
	const prevMonth = $derived(offsetMonth(baseMonth, viewMonth ? -1 : -2));
	const nextMonth = $derived(viewMonth ? offsetMonth(viewMonth, 1) : null);
	const isCurrentOrFuture = $derived(nextMonth ? nextMonth > currentYM : true);

	function formatMonthLabel(/** @type {string} */ ym) {
		const [y, m] = ym.split('-').map(Number);
		const d = new Date(y, m - 1, 1);
		return d.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { month: 'long', year: 'numeric' });
	}

	const prevHref = $derived(resolve('/fitness/[history=fitnessHistory]/[[month=fitnessMonth]]', { history: s.history, month: prevMonth }));
	const nextHref = $derived(
		nextMonth && nextMonth === currentYM
			? resolve('/fitness/[history=fitnessHistory]', { history: s.history })
			: nextMonth
				? resolve('/fitness/[history=fitnessHistory]/[[month=fitnessMonth]]', { history: s.history, month: nextMonth })
				: null
	);
	const recentHref = $derived(resolve('/fitness/[history=fitnessHistory]', { history: s.history }));
</script>

<svelte:head><title>{t.history_title} - Bocken</title></svelte:head>

<div class="history-page">
	<h1 class="sr-only">{t.history_title}</h1>

	{#if sessions.length === 0}
		<p class="empty">{t.no_workouts_yet}</p>
	{:else}
		{#each Object.entries(grouped) as [month, monthSessions] (month)}
			<section class="month-group">
				<h2 class="month-header">{month} — {monthSessions.length} {monthSessions.length !== 1 ? t.workouts_plural : t.workout_singular}</h2>
				<div class="session-list">
					{#each monthSessions as session (session._id)}
						<SessionCard {session} unsynced={queuedIds.has(session._id)} />
					{/each}
				</div>
			</section>
		{/each}
	{/if}

	<nav class="month-nav">
		{#if nextHref && !isCurrentOrFuture}
			<a class="month-link" href={nextHref}>
				<ChevronLeft size={16} />
				{formatMonthLabel(/** @type {string} */ (nextMonth))}
			</a>
		{/if}
		{#if viewMonth}
			<a class="month-link" href={recentHref}>
				{t.recent_label}
			</a>
		{/if}
		<a class="month-link" href={prevHref}>
			{formatMonthLabel(prevMonth)}
			<ChevronRight size={16} />
		</a>
	</nav>
</div>

<style>
	.history-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.empty {
		text-align: center;
		color: var(--color-text-secondary);
		padding: 3rem 0;
	}
	.month-group {
		margin-bottom: 0.5rem;
	}
	.month-header {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		margin: 0 0 0.5rem;
	}
	.session-list {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.month-nav {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		padding: 1rem 0;
	}
	.month-link {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.5rem 1rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-primary);
		font-size: 0.85rem;
		font-weight: 600;
		text-decoration: none;
		transition: border-color var(--transition-normal), background var(--transition-normal);
	}
	.month-link:hover {
		border-color: var(--color-primary);
		background: var(--color-bg-elevated);
	}
</style>
