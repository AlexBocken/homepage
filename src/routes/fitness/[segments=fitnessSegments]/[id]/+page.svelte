<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Route from '@lucide/svelte/icons/route';
	import Mountain from '@lucide/svelte/icons/mountain';
	import Users from '@lucide/svelte/icons/users';
	import Crown from '@lucide/svelte/icons/crown';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import { detectFitnessLang, fitnessSlugs, m } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
	import { createTrackHover } from '$lib/stores/trackHover.svelte';
	import { attachTrackMap } from '$lib/fitness/gpsTrackHover.svelte';
	import { formatElapsed, formatPaceKm, formatDelta } from '$lib/fitness/segmentFormat';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const me = $derived(page.data.session?.user?.nickname ?? '');
	const seg = $derived(data.segment);

	// KOM time — every other row on the board is shown relative to it (+0:18).
	const komSeconds = $derived(
		data.leaderboard.length
			? Math.min(...data.leaderboard.map((r: { elapsedSeconds: number }) => r.elapsedSeconds))
			: 0
	);

	// Your attempts, most recent first.
	const myEfforts = $derived(
		[...(data.myEfforts ?? [])].sort(
			(a: { date: string | Date }, b: { date: string | Date }) =>
				new Date(b.date).getTime() - new Date(a.date).getTime()
		)
	);
	const isOwner = $derived(seg.createdBy === me);

	const mapTrack = $derived((seg.points as number[][]).map((p) => ({ lat: p[0], lng: p[1], timestamp: 0 })));
	const hover = createTrackHover();

	const locale = $derived(lang === 'de' ? 'de-CH' : 'en-GB');
	function fmtDate(d: string | Date) {
		return new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
	}

	let rescanning = $state(false);
	async function rescan() {
		if (rescanning) return;
		rescanning = true;
		try {
			const res = await fetch(`/api/fitness/segments/${seg._id}/rescan`, { method: 'POST' });
			const d = await res.json();
			if (res.ok) {
				toast.success(`${d.effortCount} ${t.rescan_done}`);
				await invalidateAll();
			} else {
				toast.error(d.error ?? 'Failed');
			}
		} catch {
			toast.error('Failed');
		} finally {
			rescanning = false;
		}
	}

	let deleting = $state(false);
	async function del() {
		if (deleting) return;
		const ok = await confirm(t.delete_segment_confirm, {
			title: t.delete_segment,
			confirmText: t.delete_segment,
			cancelText: t.cancel,
			destructive: true
		});
		if (!ok) return;
		deleting = true;
		const res = await fetch(`/api/fitness/segments/${seg._id}`, { method: 'DELETE' });
		if (res.ok) {
			goto(resolve('/fitness/[segments=fitnessSegments]', { segments: fitnessSlugs(lang).segments }));
		} else {
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>{seg.name}</title>
	<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
</svelte:head>

<div class="segment-detail">
	<header>
		<h1>{seg.name}</h1>
		{#if isOwner}
			<div class="owner-actions">
				<button class="rescan" onclick={rescan} disabled={rescanning}>
					<RefreshCw size={16} class={rescanning ? 'spin' : ''} /> {rescanning ? t.rescanning : t.rescan}
				</button>
				<button class="delete" onclick={del} disabled={deleting} aria-label={t.delete_segment}>
					<Trash2 size={16} /> {t.delete_segment}
				</button>
			</div>
		{/if}
	</header>

	<div class="track-map" {@attach attachTrackMap(mapTrack, hover)}></div>

	<div class="stat-row">
		<span class="stat"><Route size={15} /> {seg.distance.toFixed(2)} {t.km}</span>
		{#if seg.elevationGain > 0}<span class="stat"><Mountain size={15} /> +{seg.elevationGain} m</span>{/if}
		<span class="stat"><Users size={15} /> {data.leaderboard.length} {t.athletes}</span>
		<span class="stat muted">{t.created_by} {seg.createdBy}</span>
	</div>

	<section class="board">
		<h2>{t.leaderboard}</h2>
		{#if data.leaderboard.length === 0}
			<p class="empty">{t.no_efforts}</p>
		{:else}
			<div class="lb" role="table" aria-label={t.leaderboard}>
				<div class="lb-head" role="row">
					<span role="columnheader">{t.rank}</span>
					<span role="columnheader" aria-label={t.athletes}></span>
					<span role="columnheader">{t.time_col}</span>
					<span role="columnheader">{t.pace}</span>
					<span role="columnheader" title={t.record_held_tooltip}>{t.held}</span>
					<span role="columnheader">{t.date_col}</span>
				</div>
				{#each data.leaderboard as row (row.username)}
					<div class="lb-row" class:me={row.username === me} role="row">
						<span class="rank" role="cell">{row.rank}</span>
						<span class="user" role="cell">
							<ProfilePicture username={row.username} size={28} />
							{#if row.rank === 1}<Crown size={14} class="crown" />{/if}
							<span class="uname">{row.username}</span>
						</span>
						<span class="time" role="cell" class:delta={row.rank !== 1}>
							{row.rank === 1 ? formatElapsed(row.elapsedSeconds) : formatDelta(row.elapsedSeconds - komSeconds)}
						</span>
						<span class="meta" role="presentation">
							<span class="pace" role="cell">{formatPaceKm(row.avgPace)}</span>
							<span class="held" role="cell">
								{#if row.holdDays > 0}
									<span class="held-badge" class:current={row.rank === 1}>{row.holdDays} {t.days_short}</span>
								{:else}—{/if}
							</span>
							<span class="date" role="cell">{fmtDate(row.date)}</span>
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	{#if myEfforts.length > 0}
		<section class="mine">
			<h2>{t.effort_history}</h2>
			<div class="hist" role="table" aria-label={t.effort_history}>
				<div class="hist-head" role="row">
					<span role="columnheader">{t.date_col}</span>
					<span role="columnheader">{t.time_col}</span>
				</div>
				{#each myEfforts as e (e._id ?? e.date)}
					{@const isBest = data.myBest != null && e.elapsedSeconds === data.myBest}
					<div class="hist-row" class:best={isBest} role="row">
						<span class="date" role="cell">
							{#if e.sessionId}
								<a href={`${resolve('/fitness/[history=fitnessHistory]/[id]', { history: fitnessSlugs(lang).history, id: e.sessionId })}?highlight=seg:${seg._id}`}>{fmtDate(e.date)}</a>
							{:else}{fmtDate(e.date)}{/if}
						</span>
						<span class="time" role="cell" class:delta={!isBest}>
							{#if isBest}{formatElapsed(e.elapsedSeconds)}<span class="pb"> · {t.your_best}</span>
							{:else}{formatDelta(e.elapsedSeconds - (data.myBest ?? e.elapsedSeconds))}{/if}
						</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>

<style>
	.segment-detail {
		max-width: 900px;
		margin-inline: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		flex-wrap: wrap;
	}
	h1 {
		margin: 0;
		font-size: 1.5rem;
	}
	.owner-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	.rescan,
	.delete {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md, 0.5rem);
		padding: 0.4rem 0.7rem;
		font-size: 0.82rem;
		cursor: pointer;
	}
	.rescan {
		color: var(--color-primary);
	}
	.rescan:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
	}
	.rescan:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.delete {
		color: var(--red);
	}
	.delete:hover:not(:disabled) {
		background: color-mix(in srgb, var(--red) 12%, transparent);
	}
	:global(.spin) {
		animation: spin 1s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.track-map {
		height: 280px;
		border-radius: 12px;
		overflow: hidden;
	}
	:global(.run-hover-pin) {
		display: none;
	}
	.stat-row {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
	}
	.stat {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.stat.muted {
		font-weight: 400;
		font-size: 0.82rem;
	}
	section {
		background: var(--color-surface);
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		padding: 1rem;
	}
	h2 {
		margin: 0 0 0.6rem;
		font-size: 1.05rem;
	}
	.empty {
		color: var(--color-text-secondary);
		margin: 0;
	}
	.lb,
	.hist {
		display: flex;
		flex-direction: column;
		font-size: 0.85rem;
	}

	/* Leaderboard: 6-column grid that collapses to a card on mobile. */
	.lb-head,
	.lb-row {
		display: grid;
		grid-template-columns: 2.5rem minmax(0, 1fr) auto auto auto auto;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.5rem;
	}
	.lb-head,
	.hist-head {
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		font-weight: 600;
		padding-bottom: 0.3rem;
	}
	.lb-row,
	.hist-row {
		border-top: 1px solid var(--color-border);
		font-variant-numeric: tabular-nums;
	}
	/* On desktop the metadata children flow into their own grid columns. */
	.lb-row .meta {
		display: contents;
	}
	.lb-row.me {
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}
	.rank {
		font-weight: 700;
		color: var(--color-text-secondary);
	}
	.user {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-weight: 600;
		min-width: 0;
	}
	.user .uname {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.user :global(.crown) {
		color: var(--color-amber-text);
		flex-shrink: 0;
	}
	.time {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	/* Non-leaders show a gap to the KOM (+0:18) — muted so the leader's absolute
	   time still reads as the reference. */
	.time.delta {
		font-weight: 600;
		color: var(--color-text-secondary);
	}
	.pace,
	.date {
		color: var(--color-text-secondary);
	}
	.held-badge {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	.held-badge.current {
		color: var(--color-amber-text);
		background: color-mix(in srgb, var(--nord13) 15%, transparent);
		padding: 0.1rem 0.4rem;
		border-radius: 1000px;
	}

	/* Attempt history: simple two-column grid. */
	.hist-head,
	.hist-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.5rem;
	}
	.hist-row .time {
		text-align: right;
	}
	.hist-row.best .time {
		color: var(--color-primary);
		font-weight: 700;
	}
	.mine .date a {
		color: var(--color-primary);
		text-decoration: none;
	}
	.mine .date a:hover {
		text-decoration: underline;
	}
	.pb {
		color: var(--color-primary);
		font-weight: 600;
	}

	/* Mobile: collapse each leaderboard row into a rank-led card with a
	   muted metadata line, so nothing overflows. */
	@media (max-width: 560px) {
		.lb-head {
			display: none;
		}
		.lb-row {
			grid-template-columns: 2rem minmax(0, 1fr) auto;
			grid-template-areas:
				'rank user time'
				'rank meta meta';
			row-gap: 0.15rem;
			column-gap: 0.6rem;
			padding: 0.55rem 0.4rem;
		}
		.rank {
			grid-area: rank;
			font-size: 1.1rem;
			align-self: center;
		}
		.user {
			grid-area: user;
		}
		.time {
			grid-area: time;
			align-self: center;
			font-size: 1.05rem;
		}
		.lb-row .meta {
			grid-area: meta;
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: 0.3rem 0.45rem;
			color: var(--color-text-secondary);
			font-size: 0.78rem;
		}
		.lb-row .meta .pace::after,
		.lb-row .meta .held::after {
			content: '·';
			margin-left: 0.45rem;
			color: var(--color-border);
		}
	}
</style>
