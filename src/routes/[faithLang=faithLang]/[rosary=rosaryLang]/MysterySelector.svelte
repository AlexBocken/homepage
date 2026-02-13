<script>
	import MysteryIcon from "$lib/components/faith/MysteryIcon.svelte";

	let { selectedMystery, todaysMystery, includeLuminous, labels, mysteryHref, selectMystery, season = null } = $props();

	const seasonalMystery = $derived(
		season === 'eastertide' ? 'glorreichen'
		: season === 'lent' ? 'schmerzhaften'
		: null
	);

	const seasonLabel = $derived(
		season === 'eastertide' ? labels.eastertide
		: season === 'lent' ? labels.lent
		: ''
	);
</script>
<style>
/* Mystery selector grid */
.mystery-selector {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 1.5rem;
	margin-bottom: 3rem;
	max-width: 750px;
	margin-left: auto;
	margin-right: auto;
}

.mystery-selector.four-mysteries {
	grid-template-columns: repeat(2, 1fr);
	max-width: 500px;
}

@media (min-width: 800px) {
	.mystery-selector.four-mysteries {
		grid-template-columns: repeat(4, 1fr);
		max-width: 900px;
	}
}

@media (max-width: 560px) {
	.mystery-selector,
	.mystery-selector.four-mysteries {
		gap: 0.75rem;
		margin-bottom: 1.5rem;
		margin-inline: 0;
		max-width: none;
	}
	.mystery-selector :global(svg) {
		width: 48px;
		height: 48px;
	}
	.mystery-button {
		padding: 1rem 0.75rem;
		gap: 0.5rem;
	}
	.mystery-button h3 {
		font-size: 0.95rem;
	}
	.today-badge {
		font-size: 0.7rem;
		padding: 0.25rem 0.5rem;
		top: 0.5rem;
		right: 0.5rem;
	}
}

@media (max-width: 410px) {
	.mystery-selector,
	.mystery-selector.four-mysteries {
		gap: 0.375rem;
		margin-bottom: 0.75rem;
		margin-inline: 0;
		max-width: none;
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.mystery-selector:not(.four-mysteries) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}
	.mystery-button {
		padding: 0.25rem 0.15rem;
		gap: 0.15rem;
		border-radius: 6px;
	}
	.mystery-button h3 {
		font-size: 0.55rem;
	}
	.today-badge {
		font-size: 0.6rem;
		padding: 0.15rem 0.35rem;
		top: 0.25rem;
		right: 0.25rem;
	}
}

@media (max-width: 350px) {
	.mystery-selector,
	.mystery-selector.four-mysteries {
		grid-template-columns: 1fr;
	}
}

.mystery-button {
	background: var(--nord1);
	border: 2px solid transparent;
	border-radius: 8px;
	padding: 2rem 1.5rem;
	cursor: pointer;
	transition: all 0.3s ease;
	text-align: center;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1rem;
	position: relative;
	text-decoration: none;
	color: inherit;
}

@media(prefers-color-scheme: light) {
	.mystery-button {
		background: var(--nord6);
	}
}

.mystery-button:hover {
	transform: translateY(-4px);
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.mystery-button.selected {
	border-color: var(--nord10);
	transform: translateY(-4px);
	box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
}

.mystery-button:hover,
.mystery-button.selected { background: var(--nord4); }


.mystery-button h3 {
	margin: 0;
	font-size: 1.2rem;
	color: var(--nord6);
}

@media(prefers-color-scheme: light) {
	.mystery-button h3 {
		color: var(--nord0);
	}
}

.mystery-button.selected h3,
.mystery-button:hover h3
{
	color: var(--nord10);
	font-weight: 700;
}

/* Today's mystery badge */
.today-badge {
	position: absolute;
	top: 1rem;
	right: 1rem;
	background: var(--nord11);
	color: white;
	padding: 0.4rem 0.8rem;
	border-radius: 4px;
	font-size: 0.85rem;
	font-weight: 600;
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.season-badge {
	background: var(--nord14);
}

.badge-stack {
	position: absolute;
	top: 1rem;
	right: 1rem;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 0.3rem;
}

.badge-stack .today-badge {
	position: static;
}
</style>

<div class="mystery-selector" class:four-mysteries={includeLuminous}>
	<a
		class="mystery-button"
		class:selected={selectedMystery === 'freudenreich'}
		href={mysteryHref('freudenreich')}
		onclick={(e) => { e.preventDefault(); selectMystery('freudenreich'); }}
	>
		{#if seasonalMystery === 'freudenreich' || todaysMystery === 'freudenreich'}
			<div class="badge-stack">
				{#if seasonalMystery === 'freudenreich'}<span class="today-badge season-badge">{seasonLabel}</span>{/if}
				{#if todaysMystery === 'freudenreich'}<span class="today-badge">{labels.today}</span>{/if}
			</div>
		{/if}
		<MysteryIcon type="joyful" />
		<h3>{labels.joyful}</h3>
	</a>

	<a
		class="mystery-button"
		class:selected={selectedMystery === 'schmerzhaften'}
		href={mysteryHref('schmerzhaften')}
		onclick={(e) => { e.preventDefault(); selectMystery('schmerzhaften'); }}
	>
		{#if seasonalMystery === 'schmerzhaften' || todaysMystery === 'schmerzhaften'}
			<div class="badge-stack">
				{#if seasonalMystery === 'schmerzhaften'}<span class="today-badge season-badge">{seasonLabel}</span>{/if}
				{#if todaysMystery === 'schmerzhaften'}<span class="today-badge">{labels.today}</span>{/if}
			</div>
		{/if}
		<MysteryIcon type="sorrowful" />
		<h3>{labels.sorrowful}</h3>
	</a>

	<a
		class="mystery-button"
		class:selected={selectedMystery === 'glorreichen'}
		href={mysteryHref('glorreichen')}
		onclick={(e) => { e.preventDefault(); selectMystery('glorreichen'); }}
	>
		{#if seasonalMystery === 'glorreichen' || todaysMystery === 'glorreichen'}
			<div class="badge-stack">
				{#if seasonalMystery === 'glorreichen'}<span class="today-badge season-badge">{seasonLabel}</span>{/if}
				{#if todaysMystery === 'glorreichen'}<span class="today-badge">{labels.today}</span>{/if}
			</div>
		{/if}
		<MysteryIcon type="glorious" />
		<h3>{labels.glorious}</h3>
	</a>

	{#if includeLuminous}
	<a
		class="mystery-button"
		class:selected={selectedMystery === 'lichtreichen'}
		href={mysteryHref('lichtreichen')}
		onclick={(e) => { e.preventDefault(); selectMystery('lichtreichen'); }}
	>
		{#if todaysMystery === 'lichtreichen'}
			<div class="badge-stack">
				<span class="today-badge">{labels.today}</span>
			</div>
		{/if}
		<MysteryIcon type="luminous" />
		<h3>{labels.luminous}</h3>
	</a>
	{/if}
</div>
