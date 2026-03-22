<script>
	import SessionCard from '$lib/components/fitness/SessionCard.svelte';

	let { data } = $props();

	let sessions = $state(data.sessions?.sessions ? [...data.sessions.sessions] : []);
	let total = $state(data.sessions?.total ? data.sessions.total : 0);
	let loading = $state(false);
	let page = $state(1);

	/** @type {Record<string, typeof sessions>} */
	const grouped = $derived.by(() => {
		/** @type {Record<string, typeof sessions>} */
		const groups = {};
		for (const s of sessions) {
			const d = new Date(s.startTime);
			const key = `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(s);
		}
		return groups;
	});

	async function loadMore() {
		if (loading || sessions.length >= total) return;
		loading = true;
		page++;
		try {
			const res = await fetch(`/api/fitness/sessions?limit=50&skip=${sessions.length}`);
			const data = await res.json();
			sessions = [...sessions, ...(data.sessions ?? [])];
			total = data.total ?? total;
		} catch {}
		loading = false;
	}
</script>

<svelte:head><title>History - Fitness</title></svelte:head>

<div class="history-page">
	<h1>History</h1>

	{#if sessions.length === 0}
		<p class="empty">No workouts yet. Start your first workout!</p>
	{:else}
		{#each Object.entries(grouped) as [month, monthSessions] (month)}
			<section class="month-group">
				<h2 class="month-header">{month} — {monthSessions.length} workout{monthSessions.length !== 1 ? 's' : ''}</h2>
				<div class="session-list">
					{#each monthSessions as session (session._id)}
						<SessionCard {session} />
					{/each}
				</div>
			</section>
		{/each}

		{#if sessions.length < total}
			<button class="load-more" onclick={loadMore} disabled={loading}>
				{loading ? 'Loading…' : 'Load more'}
			</button>
		{/if}
	{/if}
</div>

<style>
	.history-page {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	h1 {
		margin: 0;
		font-size: 1.4rem;
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
	.load-more {
		align-self: center;
		padding: 0.6rem 2rem;
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		color: var(--color-primary);
		font-weight: 600;
		cursor: pointer;
	}
	.load-more:hover {
		border-color: var(--color-accent);
	}
	.load-more:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
