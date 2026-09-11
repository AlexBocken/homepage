<script lang="ts">
	import { confirm } from '$lib/js/confirmDialog.svelte';
	import { toast } from '$lib/js/toast.svelte';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	let { data } = $props();

	type Phase = 'idle' | 'sessions' | 'segments' | 'pruning';

	let phase = $state<Phase>('idle');
	let done = $state(0);
	let rendered = $state(0);
	let failed = $state(0);
	let log = $state('');

	const total = $derived(data.sessions + data.segments);
	const percent = $derived(total > 0 ? Math.round((done / total) * 100) : 0);
	const busy = $derived(phase !== 'idle');

	async function batch(kind: 'sessions' | 'segments', skip: number) {
		const res = await fetch('/api/admin/fitness-images', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ kind, skip })
		});
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as {
			processed: number;
			rendered: number;
			failed: number;
			nextSkip: number | null;
		};
	}

	/** Walk one collection batch by batch, so the bar moves and no single
	 * request sits there rendering for minutes. */
	async function run(kind: 'sessions' | 'segments') {
		phase = kind;
		let skip: number | null = 0;
		while (skip !== null) {
			const r = await batch(kind, skip);
			done += r.processed;
			rendered += r.rendered;
			failed += r.failed;
			log = `${kind === 'sessions' ? 'Workouts' : 'Segmente'}: ${done} von ${total}`;
			skip = r.nextSkip;
		}
	}

	async function regenerateAll() {
		if (busy) return;
		done = 0;
		rendered = 0;
		failed = 0;
		log = '';
		try {
			await run('sessions');
			await run('segments');
			log = `Fertig — ${rendered} Bilder erzeugt${failed ? `, ${failed} fehlgeschlagen` : ''}.`;
			toast.success(`${rendered} Bilder neu erzeugt`);
		} catch (err) {
			log = `Abgebrochen: ${err instanceof Error ? err.message : String(err)}`;
			toast.error('Neuerzeugung fehlgeschlagen');
		} finally {
			phase = 'idle';
		}
	}

	async function prune() {
		if (busy) return;
		const ok = await confirm(
			'Alle Dateien in $IMAGE_DIR/fitness/ löschen, die kein aktuelles Workout und kein Segment mehr anfordert. Am besten erst nach einer vollständigen Neuerzeugung.',
			{ title: 'Verwaiste Bilder löschen?', confirmText: 'Löschen', destructive: true }
		);
		if (!ok) return;
		phase = 'pruning';
		try {
			const res = await fetch('/api/admin/fitness-images', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ kind: 'prune' })
			});
			if (!res.ok) throw new Error(await res.text());
			const r = (await res.json()) as { deleted: number; kept: number; bytesFreed: number };
			const mb = (r.bytesFreed / 1024 / 1024).toFixed(1);
			log = `${r.deleted} verwaiste Dateien gelöscht (${mb} MB frei), ${r.kept} behalten.`;
			toast.success(`${r.deleted} Dateien gelöscht`);
		} catch (err) {
			log = `Abgebrochen: ${err instanceof Error ? err.message : String(err)}`;
			toast.error('Aufräumen fehlgeschlagen');
		} finally {
			phase = 'idle';
		}
	}
</script>

<svelte:head>
	<title>Fitness-Bilder neu erzeugen</title>
</svelte:head>

<main>
	<header>
		<span class="g-icon-badge"><ImageIcon size={20} /></span>
		<div>
			<h1>Fitness-Bilder</h1>
			<p class="sub">
				Streckenkarten und Share-Cards werden sonst erst beim ersten Aufruf gerendert. Hier
				werden sie für alle Workouts und Segmente auf einmal neu erzeugt — nötig, wenn sich
				die Darstellung geändert hat (Detailgrad, Farben, Layout).
			</p>
		</div>
	</header>

	<section class="counts">
		<div class="count">
			<strong>{data.sessions}</strong>
			<span>Workouts</span>
		</div>
		<div class="count">
			<strong>{data.segments}</strong>
			<span>Segmente</span>
		</div>
	</section>

	<section class="actions">
		<button class="primary" onclick={regenerateAll} disabled={busy}>
			<RefreshCw size={16} />
			{phase === 'sessions' || phase === 'segments' ? 'Läuft …' : 'Alle neu erzeugen'}
		</button>
		<button class="ghost" onclick={prune} disabled={busy}>
			<Trash2 size={16} />
			Verwaiste Dateien löschen
		</button>
	</section>

	{#if busy || log}
		<section class="progress" aria-live="polite">
			{#if phase === 'sessions' || phase === 'segments'}
				<div
					class="bar"
					role="progressbar"
					aria-valuenow={percent}
					aria-valuemin="0"
					aria-valuemax="100"
				>
					<div class="fill" style:width="{percent}%"></div>
				</div>
			{/if}
			<p class="log">{log || 'Wird vorbereitet …'}</p>
		</section>
	{/if}
</main>

<style>
	main {
		max-width: 720px;
		margin-inline: auto;
		padding: 2rem 1rem 4rem;
	}
	header {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 2rem;
	}
	h1 {
		margin: 0 0 0.25rem;
		font-size: var(--text-2xl);
		color: var(--color-text-primary);
	}
	.sub {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		line-height: 1.5;
	}
	.counts {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}
	.count {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
	}
	.count strong {
		font-size: var(--text-2xl);
		color: var(--color-text-primary);
	}
	.count span {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
	}
	button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1.1rem;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		font-size: var(--text-sm);
		font-weight: 600;
		cursor: pointer;
		transition: background var(--transition-normal), scale var(--transition-fast);
	}
	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	button:not(:disabled):hover {
		scale: 1.02;
	}
	.primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}
	.primary:not(:disabled):hover {
		background: var(--color-primary-hover);
	}
	.ghost {
		background: var(--color-bg-tertiary);
		border-color: var(--color-border);
		color: var(--red);
	}
	.ghost:not(:disabled):hover {
		background: var(--color-bg-elevated);
	}
	.progress {
		margin-top: 1.5rem;
	}
	.bar {
		height: 0.5rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		overflow: hidden;
	}
	.fill {
		height: 100%;
		background: var(--color-primary);
		transition: width var(--transition-normal);
	}
	.log {
		margin: 0.6rem 0 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	@media (max-width: 560px) {
		.counts {
			gap: 0.5rem;
		}
	}
</style>
