<script lang="ts">
	import { page } from '$app/state';
	import { confirm } from '$lib/js/confirmDialog.svelte';

	const isEn = $derived(page.params.recipeLang === 'en');

	type Report = {
		applied: boolean;
		meals: { total: number; converted: number; alreadyConverted: number; flagged: { id: string; name: string; reason: string }[] };
		entries: {
			total: number; converted: number; alreadyConverted: number; frozen: number;
			frozenDetail: { id: string; name: string; oldCal: number; newCal: number }[];
			failures: { id: string; name: string; source: string; reason: string }[];
		};
	};

	let running = $state(false);
	let report = $state<Report | null>(null);
	let error = $state('');

	async function run(apply: boolean) {
		if (apply && !(await confirm(
			isEn
				? 'Rewrite every food-log entry into reference form? This is a one-time migration. Run a dry run first.'
				: 'Alle Ernährungslog-Einträge in Referenzform umschreiben? Einmalige Migration. Vorher einen Probelauf machen.',
			{ title: isEn ? 'Apply migration' : 'Migration anwenden', confirmText: isEn ? 'Apply' : 'Anwenden', destructive: true },
		))) return;

		running = true;
		error = '';
		try {
			const res = await fetch(`${page.url.pathname}/run${apply ? '?apply=true' : ''}`, { method: 'POST' });
			if (!res.ok) { error = `${res.status} ${res.statusText}`; return; }
			report = await res.json();
		} catch (e) {
			error = String(e);
		} finally {
			running = false;
		}
	}
</script>

<svelte:head><title>{isEn ? 'Convert food log' : 'Ernährungslog konvertieren'}</title></svelte:head>

<div class="wrap">
	<h1>{isEn ? 'Convert food log to references' : 'Ernährungslog auf Referenzen umstellen'}</h1>
	<p class="lede">
		{isEn
			? 'Rewrites diary entries and custom meals from stored nutrition snapshots into references to the BLS/USDA/OFF tables, so a fix to a source entry reaches every day it was logged. Idempotent and orphan-safe. Always dry-run first.'
			: 'Schreibt Tagebucheinträge und eigene Mahlzeiten von gespeicherten Nährwert-Snapshots auf Referenzen zu den BLS/USDA/OFF-Tabellen um, damit eine Korrektur an einem Quelldatensatz jeden erfassten Tag erreicht. Idempotent und robust gegen gelöschte Vorlagen. Immer zuerst einen Probelauf.'}
	</p>

	<div class="actions">
		<button onclick={() => run(false)} disabled={running}>{isEn ? 'Dry run' : 'Probelauf'}</button>
		<button class="apply" onclick={() => run(true)} disabled={running}>{isEn ? 'Apply' : 'Anwenden'}</button>
	</div>

	{#if running}<p class="status">{isEn ? 'Running…' : 'Läuft…'}</p>{/if}
	{#if error}<p class="err">{error}</p>{/if}

	{#if report}
		<div class="report" class:applied={report.applied}>
			<p class="mode">{report.applied ? (isEn ? '✓ Applied — changes written' : '✓ Angewendet — Änderungen geschrieben') : (isEn ? 'Dry run — nothing written' : 'Probelauf — nichts geschrieben')}</p>

			<h2>{isEn ? 'Custom meals' : 'Eigene Mahlzeiten'}</h2>
			<p>{report.meals.converted} {isEn ? 'converted' : 'konvertiert'}, {report.meals.alreadyConverted} {isEn ? 'already done' : 'bereits erledigt'} / {report.meals.total}</p>
			{#each report.meals.flagged as f (f.id + f.reason)}<p class="flag">⚠ {f.name}: {f.reason}</p>{/each}

			<h2>{isEn ? 'Food log entries' : 'Ernährungslog-Einträge'}</h2>
			<p>{report.entries.converted} {isEn ? 'converted' : 'konvertiert'}, {report.entries.alreadyConverted} {isEn ? 'already done' : 'bereits erledigt'} / {report.entries.total}</p>
			{#if report.entries.frozen}
				<p class="frozen-head">{report.entries.frozen} {isEn ? 'kept a frozen snapshot (meal/recipe edited since logging):' : 'behielten einen eingefrorenen Snapshot (Mahlzeit/Rezept seit dem Erfassen geändert):'}</p>
				{#each report.entries.frozenDetail as f (f.id)}<p class="frozen">❄ {f.name}: {isEn ? 'logged' : 'erfasst'} {f.oldCal} kcal, {isEn ? 'current would give' : 'aktuell ergäbe'} {f.newCal}</p>{/each}
			{/if}
			{#each report.entries.failures as f (f.id)}<p class="flag">⚠ {f.name} [{f.source}]: {f.reason}</p>{/each}
		</div>
	{/if}
</div>

<style>
	.wrap { max-width: 800px; margin: 2rem auto; padding: 1.5rem; }
	h1 { font-size: 1.8rem; }
	.lede { color: var(--color-text-secondary); line-height: 1.5; }
	.actions { display: flex; gap: 1rem; margin: 1.5rem 0; }
	button {
		padding: 0.6rem 1.4rem; border-radius: var(--radius-md); border: 1px solid var(--color-border);
		background: var(--color-bg-tertiary); color: var(--color-text-primary); font-size: 1rem; cursor: pointer;
	}
	button:disabled { opacity: 0.5; cursor: default; }
	button.apply { background: var(--color-primary); color: var(--color-text-on-primary); border-color: transparent; }
	.status { color: var(--color-text-secondary); }
	.err { color: var(--red); }
	.report { margin-top: 1.5rem; padding: 1.25rem; border-radius: var(--radius-lg); background: var(--color-surface); border: 1px solid var(--color-border); }
	.report.applied { border-color: var(--green); }
	.mode { font-weight: 700; margin-top: 0; }
	h2 { font-size: 1.1rem; margin: 1rem 0 0.25rem; }
	.report p { margin: 0.2rem 0; }
	.flag { color: var(--orange); font-size: 0.9rem; }
	.frozen-head { color: var(--color-text-secondary); margin-top: 0.5rem; }
	.frozen { color: var(--blue); font-size: 0.9rem; }
</style>
