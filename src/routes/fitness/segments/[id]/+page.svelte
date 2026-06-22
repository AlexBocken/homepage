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
	import { detectFitnessLang, m } from '$lib/js/fitnessI18n';
	import { toast } from '$lib/js/toast.svelte';
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import ProfilePicture from '$lib/components/cospend/ProfilePicture.svelte';
	import { createTrackHover } from '$lib/stores/trackHover.svelte';
	import { attachTrackMap } from '$lib/fitness/gpsTrackHover.svelte';
	import { formatElapsed, formatPaceKm } from '$lib/fitness/segmentFormat';

	let { data } = $props();

	const lang = $derived(detectFitnessLang(page.url.pathname));
	const t = $derived(m[lang]);
	const me = $derived(page.data.session?.user?.nickname ?? '');
	const seg = $derived(data.segment);

	// Your attempts, fastest first.
	const myEfforts = $derived(
		[...(data.myEfforts ?? [])].sort((a, b) => a.elapsedSeconds - b.elapsedSeconds)
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
			goto(resolve('/fitness/segments'));
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
			<table>
				<thead>
					<tr><th>{t.rank}</th><th></th><th>{t.time_col}</th><th>{t.pace}</th><th title={t.record_held_tooltip}>{t.held}</th><th>{t.date_col}</th></tr>
				</thead>
				<tbody>
					{#each data.leaderboard as row (row.username)}
						<tr class:me={row.username === me}>
							<td class="rank">{row.rank}</td>
							<td class="user">
								<ProfilePicture username={row.username} size={28} />
								{#if row.rank === 1}<Crown size={14} class="crown" />{/if}
								<span class="uname">{row.username}</span>
							</td>
							<td class="time">{formatElapsed(row.elapsedSeconds)}</td>
							<td class="pace">{formatPaceKm(row.avgPace)}</td>
							<td class="held">
								{#if row.holdDays > 0}
									<span class="held-badge" class:current={row.rank === 1}>
										{row.holdDays} {t.days_short}
									</span>
								{:else}—{/if}
							</td>
							<td class="date">{fmtDate(row.date)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</section>

	{#if myEfforts.length > 0}
		<section class="mine">
			<h2>{t.effort_history}</h2>
			<table>
				<thead><tr><th>{t.date_col}</th><th>{t.time_col}</th></tr></thead>
				<tbody>
					{#each myEfforts as e (e._id ?? e.date)}
						{@const isBest = data.myBest != null && e.elapsedSeconds === data.myBest}
						<tr class:best={isBest}>
							<td class="date">{fmtDate(e.date)}</td>
							<td class="time">{formatElapsed(e.elapsedSeconds)}{#if isBest}<span class="pb"> · {t.your_best}</span>{/if}</td>
						</tr>
					{/each}
				</tbody>
			</table>
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
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}
	th {
		text-align: left;
		font-size: 0.7rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-text-secondary);
		padding: 0.3rem 0.5rem;
		font-weight: 600;
	}
	td {
		padding: 0.4rem 0.5rem;
		border-top: 1px solid var(--color-border);
		font-variant-numeric: tabular-nums;
	}
	tr.me {
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
	}
	tr.best .time {
		color: var(--color-primary);
		font-weight: 700;
	}
	.rank {
		font-weight: 700;
		color: var(--color-text-secondary);
		width: 2.5rem;
	}
	.user {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-weight: 600;
	}
	.user .uname {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.user :global(.crown) {
		color: var(--nord13);
		flex-shrink: 0;
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
		color: var(--nord13);
		background: color-mix(in srgb, var(--nord13) 15%, transparent);
		padding: 0.1rem 0.4rem;
		border-radius: 1000px;
	}
	.time {
		font-weight: 700;
	}
	.pace,
	.date {
		color: var(--color-text-secondary);
	}
	.pb {
		color: var(--color-primary);
		font-weight: 600;
	}
</style>
