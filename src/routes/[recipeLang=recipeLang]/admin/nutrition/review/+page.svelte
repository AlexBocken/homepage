<script>
	/**
	 * The nutrition review queue.
	 *
	 * One question: how much of the recipe collection has had its ingredients
	 * confirmed against the food tables, and what is left. The list is the way in —
	 * the walk itself happens one recipe at a time in `[name]`.
	 */
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import ListChecks from '@lucide/svelte/icons/list-checks';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	let { data } = $props();

	const queue = $derived(data.queue);
	const lang = $derived(data.recipeLang);
	const pending = $derived(queue.entries.filter((/** @type {any} */ e) => !e.clean));
	const done = $derived(queue.entries.filter((/** @type {any} */ e) => e.clean));

	let showDone = $state(false);

	/** The badges one row shows — only the buckets it actually has anything in. */
	function badges(/** @type {any} */ entry) {
		return [
			{ state: 'open', count: entry.counts.open, label: 'ohne Zuordnung' },
			{ state: 'unsure', count: entry.counts.unsure, label: 'unsicher' },
			{ state: 'missing', count: entry.unmapped, label: 'ohne Zeile' },
		].filter((b) => b.count > 0);
	}
</script>

<svelte:head>
	<title>Nährwert-Prüfung</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="page">
	<header class="head">
		<h1>Nährwert-Prüfung</h1>
		<p class="subtitle">
			Jede Zutat einmal gegen die Nährwerttabellen angeschaut. Rezepte, in denen nichts mehr offen
			ist, werden beim Durchgehen übersprungen.
		</p>
	</header>

	<section class="stats" aria-label="Fortschritt">
		<div class="stat stat-green">
			<span class="stat-value" data-stat="green">{queue.green}</span>
			<span class="stat-label">vollständig geprüft</span>
			<span class="stat-sub">{queue.greenPercent}% von {queue.total}</span>
		</div>
		<div class="stat stat-open">
			<span class="stat-value" data-stat="pending">{pending.length}</span>
			<span class="stat-label">noch zu prüfen</span>
			<span class="stat-sub">{queue.total - queue.green === 0 ? 'nichts offen' : 'Rezepte mit offenen Zeilen'}</span>
		</div>
		<div class="stat">
			<span class="stat-value" data-stat="total">{queue.total}</span>
			<span class="stat-label">Rezepte gesamt</span>
			<span class="stat-sub">alphabetisch durchgegangen</span>
		</div>
	</section>

	<div
		class="bar"
		role="progressbar"
		aria-valuenow={queue.greenPercent}
		aria-valuemin="0"
		aria-valuemax="100"
		aria-label="Anteil vollständig geprüfter Rezepte"
	>
		<div class="bar-fill" style="width: {queue.greenPercent}%"></div>
	</div>

	{#if pending.length > 0}
		<a class="cta" href="/{lang}/admin/nutrition/review/{pending[0].shortName}">
			<ListChecks size={18} />
			Prüfung fortsetzen
			<ArrowRight size={16} />
		</a>
	{:else}
		<p class="all-clear">
			<CircleCheck size={18} />
			Alle Rezepte geprüft.
		</p>
	{/if}

	{#if pending.length > 0}
		<section class="list-section">
			<h2>Offen <span class="count">{pending.length}</span></h2>
			<ul class="list">
				{#each pending as entry (entry.shortName)}
					<li>
						<a class="row" data-review-row={entry.shortName} href="/{lang}/admin/nutrition/review/{entry.shortName}">
							<span class="row-name">{entry.name}</span>
							<span class="row-badges">
								{#if !entry.generated}
									<span class="badge" data-state="missing">nie zugeordnet</span>
								{:else}
									{#each badges(entry) as badge (badge.state)}
										<span class="badge" data-state={badge.state}>
											{badge.count}&nbsp;{badge.label}
										</span>
									{/each}
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	{#if done.length > 0}
		<section class="list-section">
			<h2>
				<button type="button" class="toggle" onclick={() => (showDone = !showDone)}>
					Geprüft <span class="count">{done.length}</span>
					<span class="chev" class:open={showDone}>›</span>
				</button>
			</h2>
			{#if showDone}
				<ul class="list">
					{#each done as entry (entry.shortName)}
						<li>
							<a class="row" data-review-row={entry.shortName} href="/{lang}/admin/nutrition/review/{entry.shortName}">
								<span class="row-name">{entry.name}</span>
								<span class="row-badges">
									<span class="badge" data-state="ok">
										{entry.counts.ok}&nbsp;zugeordnet
									</span>
									{#if entry.counts.ref > 0}
										<span class="badge" data-state="ref">{entry.counts.ref}&nbsp;Grundrezept</span>
									{/if}
									{#if entry.counts.skipped > 0}
										<span class="badge" data-state="skipped">
											{entry.counts.skipped}&nbsp;übersprungen
										</span>
									{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</div>

<style>
	.page {
		max-width: 1000px;
		margin: 2rem auto 4rem;
		padding: 0 1rem;
	}

	.head h1 {
		margin: 0 0 0.3rem;
		color: var(--color-text-primary);
	}
	.subtitle {
		margin: 0 0 2rem;
		color: var(--color-text-secondary);
		max-width: 60ch;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 1rem;
		margin-bottom: 1rem;
	}
	.stat {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 1.1rem 1.2rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}
	.stat-value {
		font-size: var(--text-3xl);
		font-weight: 700;
		line-height: 1;
		color: var(--color-text-primary);
		font-variant-numeric: tabular-nums;
	}
	.stat-green .stat-value {
		color: var(--green);
	}
	.stat-open .stat-value {
		color: var(--orange);
	}
	.stat-label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-primary);
	}
	.stat-sub {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.bar {
		height: 10px;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		overflow: hidden;
		margin-bottom: 1.5rem;
	}
	.bar-fill {
		height: 100%;
		background: var(--green);
		transition: width var(--transition-normal);
	}

	.cta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.7rem 1.3rem;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 600;
		text-decoration: none;
		transition: background var(--transition-fast), scale var(--transition-fast);
	}
	.cta:hover {
		background: var(--color-primary-hover);
		scale: 1.02;
	}

	.all-clear {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--green);
		font-weight: 600;
	}

	.list-section {
		margin-top: 2.5rem;
	}
	.list-section h2 {
		font-size: var(--text-lg);
		color: var(--color-text-primary);
		margin: 0 0 0.75rem;
	}
	.count {
		display: inline-block;
		margin-left: 0.4rem;
		padding: 0.05rem 0.5rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		vertical-align: middle;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		background: none;
		border: none;
		padding: 0;
		font: inherit;
		color: inherit;
		cursor: pointer;
	}
	.chev {
		display: inline-block;
		margin-left: 0.3rem;
		color: var(--color-text-secondary);
		transition: rotate var(--transition-fast);
	}
	.chev.open {
		rotate: 90deg;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.7rem 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		text-decoration: none;
		transition: background var(--transition-fast), border-color var(--transition-fast);
	}
	.row:hover {
		background: var(--color-surface-hover);
		border-color: var(--color-text-tertiary);
	}
	.row-name {
		font-weight: 600;
	}
	.row-badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		justify-content: flex-end;
	}

	/* The mapper's own vocabulary: orange for a line with no match, yellow for one
	   worth a second look, green for settled, blue for a base recipe. */
	.badge {
		padding: 0.1rem 0.55rem;
		border-radius: var(--radius-pill);
		font-size: 0.7rem;
		font-weight: 600;
		white-space: nowrap;
		border: 1px solid var(--color-border);
		color: var(--color-text-secondary);
	}
	.badge[data-state='open'],
	.badge[data-state='missing'] {
		background: color-mix(in srgb, var(--orange) 15%, transparent);
		border-color: var(--orange);
		color: var(--color-text-primary);
	}
	.badge[data-state='unsure'] {
		background: color-mix(in srgb, var(--yellow) 20%, transparent);
		border-color: var(--yellow);
		color: var(--color-text-primary);
	}
	.badge[data-state='ok'] {
		background: color-mix(in srgb, var(--green) 15%, transparent);
		border-color: var(--green);
		color: var(--color-text-primary);
	}
	.badge[data-state='ref'] {
		background: color-mix(in srgb, var(--lightblue) 20%, transparent);
		border-color: var(--lightblue);
		color: var(--color-text-primary);
	}

	@media (max-width: 560px) {
		.stats {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}
		.row {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.4rem;
		}
		.row-badges {
			justify-content: flex-start;
		}
	}
</style>
