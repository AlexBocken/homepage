<script>
	import ToTryCard from '$lib/components/recipes/ToTryCard.svelte';

	let { data } = $props();

	let items = $state(data.items ?? []);

	const isEnglish = $derived(data.lang === 'en');
	const labels = $derived({
		title: isEnglish ? 'To Try' : 'Zum Ausprobieren',
		pageTitle: isEnglish ? 'Recipes To Try - Bocken Recipes' : 'Zum Ausprobieren - Bocken Rezepte',
		metaDescription: isEnglish
			? 'Recipes we want to try from around the web.'
			: 'Rezepte, die wir ausprobieren wollen.',
		count: isEnglish
			? `${items.length} recipe${items.length !== 1 ? 's' : ''} to try`
			: `${items.length} Rezept${items.length !== 1 ? 'e' : ''} zum Ausprobieren`,
		noItems: isEnglish ? 'Nothing here yet' : 'Noch nichts vorhanden',
		emptyState: isEnglish
			? 'Add a recipe you want to try using the form below.'
			: 'Füge ein Rezept hinzu, das du ausprobieren möchtest.',
		name: isEnglish ? 'Recipe name' : 'Rezeptname',
		url: 'URL',
		label: isEnglish ? 'Label (optional)' : 'Bezeichnung (optional)',
		notes: isEnglish ? 'Notes (optional)' : 'Notizen (optional)',
		addLink: isEnglish ? 'Add link' : 'Link hinzufügen',
		save: isEnglish ? 'Save' : 'Speichern',
		cancel: isEnglish ? 'Cancel' : 'Abbrechen',
		add: isEnglish ? 'Add recipe to try' : 'Rezept hinzufügen',
		editHeading: isEnglish ? 'Edit recipe' : 'Rezept bearbeiten'
	});
	let showForm = $state(false);
	let saving = $state(false);
	let editingId = $state(null);

	// Form state
	let name = $state('');
	let links = $state([{ url: '', label: '' }]);
	let notes = $state('');

	function addLinkRow() {
		links.push({ url: '', label: '' });
	}

	function removeLinkRow(index) {
		links.splice(index, 1);
	}

	function resetForm() {
		name = '';
		links = [{ url: '', label: '' }];
		notes = '';
		editingId = null;
		showForm = false;
	}

	function handleEdit(item) {
		name = item.name;
		links = item.links.map(l => ({ url: l.url, label: l.label || '' }));
		notes = item.notes || '';
		editingId = item._id;
		showForm = true;
	}

	async function handleSave() {
		const validLinks = links.filter(l => l.url.trim());
		if (!name.trim() || validLinks.length === 0) return;

		saving = true;
		try {
			if (editingId) {
				const res = await fetch(`/api/${data.recipeLang}/to-try`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id: editingId, name, links: validLinks, notes })
				});
				if (res.ok) {
					const updated = await res.json();
					items = items.map(i => i._id === editingId ? updated : i);
					resetForm();
				}
			} else {
				const res = await fetch(`/api/${data.recipeLang}/to-try`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ name, links: validLinks, notes })
				});
				if (res.ok) {
					const created = await res.json();
					items = [created, ...items];
					resetForm();
				}
			}
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id) {
		const msg = isEnglish ? 'Delete this recipe?' : 'Dieses Rezept löschen?';
		if (!confirm(msg)) return;

		const res = await fetch(`/api/${data.recipeLang}/to-try`, {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		if (res.ok) {
			items = items.filter(i => i._id !== id);
			if (editingId === id) resetForm();
		}
	}
</script>

<style>
h1 {
	text-align: center;
	margin-bottom: 0;
	font-size: 4rem;
}
.subheading {
	text-align: center;
	margin-top: 0;
	font-size: 1.5rem;
}
.empty-state {
	text-align: center;
	margin-top: 3rem;
	color: var(--nord3);
}
.add-bar {
	text-align: center;
	margin-bottom: 1.5em;
}
.add-btn {
	background: var(--nord10);
	color: white;
	border: none;
	border-radius: var(--radius-pill);
	padding: 0.5em 1.2em;
	font-size: 1rem;
	cursor: pointer;
	transition: background var(--transition-fast);
}
.add-btn:hover {
	background: var(--nord9);
}
.form-card {
	max-width: 540px;
	margin: 0 auto 2em;
	padding: 1.2em;
	background: var(--color-surface);
	border-radius: var(--radius-card);
	box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.form-card input,
.form-card textarea {
	width: 100%;
	padding: 0.5em;
	border: 1px solid var(--nord4);
	border-radius: 6px;
	font-size: 0.95rem;
	font-family: inherit;
	background: inherit;
	color: inherit;
	box-sizing: border-box;
}
@media (prefers-color-scheme: dark) {
	.form-card input,
	.form-card textarea {
		border-color: var(--nord3);
	}
}
.form-card textarea {
	resize: vertical;
	min-height: 60px;
}
.field {
	margin-bottom: 0.8em;
}
.field label {
	display: block;
	font-size: 0.85rem;
	font-weight: 600;
	margin-bottom: 0.25em;
}
.link-row {
	display: flex;
	gap: 0.4em;
	margin-bottom: 0.4em;
	align-items: center;
}
.link-row input {
	flex: 1;
}
.link-remove {
	background: var(--nord11);
	color: white;
	border: none;
	border-radius: var(--radius-pill);
	width: 1.5em;
	height: 1.5em;
	font-size: 0.8rem;
	cursor: pointer;
	display: grid;
	place-items: center;
	flex-shrink: 0;
}
.link-add {
	background: none;
	border: none;
	color: var(--nord10);
	cursor: pointer;
	font-size: 0.85rem;
	padding: 0.2em 0;
}
.link-add:hover {
	text-decoration: underline;
}
.form-actions {
	display: flex;
	gap: 0.6em;
	justify-content: flex-end;
	margin-top: 1em;
}
.btn-save {
	background: var(--nord14);
	color: var(--nord0);
	border: none;
	border-radius: var(--radius-pill);
	padding: 0.45em 1.2em;
	font-size: 0.95rem;
	cursor: pointer;
	transition: background var(--transition-fast);
}
.btn-save:hover {
	background: var(--nord7);
}
.btn-save:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}
.btn-cancel {
	background: none;
	border: 1px solid var(--nord4);
	border-radius: var(--radius-pill);
	padding: 0.45em 1.2em;
	font-size: 0.95rem;
	cursor: pointer;
	color: inherit;
}
.form-heading {
	margin: 0 0 0.6em;
	font-size: 1.1rem;
}
</style>

<svelte:head>
	<title>{labels.pageTitle}</title>
	<meta name="description" content={labels.metaDescription} />
</svelte:head>

<h1>{labels.title}</h1>
<p class="subheading">
	{#if items.length > 0}
		{labels.count}
	{:else}
		{labels.noItems}
	{/if}
</p>

<div class="add-bar">
	{#if !showForm}
		<button class="add-btn" onclick={() => showForm = true}>+ {labels.add}</button>
	{/if}
</div>

{#if showForm}
	<div class="form-card">
		{#if editingId}
			<h2 class="form-heading">{labels.editHeading}</h2>
		{/if}
		<div class="field">
			<label for="totry-name">{labels.name}</label>
			<input id="totry-name" type="text" bind:value={name} />
		</div>

		<div class="field">
			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label>Links</label>
			{#each links as link, i (i)}
				<div class="link-row">
					<input type="url" placeholder={labels.url} bind:value={link.url} />
					<input type="text" placeholder={labels.label} bind:value={link.label} />
					{#if links.length > 1}
						<button class="link-remove" onclick={() => removeLinkRow(i)} aria-label="Remove link">✕</button>
					{/if}
				</div>
			{/each}
			<button class="link-add" onclick={addLinkRow}>+ {labels.addLink}</button>
		</div>

		<div class="field">
			<label for="totry-notes">{labels.notes}</label>
			<textarea id="totry-notes" bind:value={notes}></textarea>
		</div>

		<div class="form-actions">
			<button class="btn-cancel" onclick={resetForm}>{labels.cancel}</button>
			<button class="btn-save" onclick={handleSave} disabled={saving || !name.trim() || !links.some(l => l.url.trim())}>
				{labels.save}
			</button>
		</div>
	</div>
{/if}

{#if items.length > 0}
	<div class="recipe-grid">
		{#each items as item (item._id)}
			<ToTryCard {item} ondelete={handleDelete} onedit={handleEdit} {isEnglish} />
		{/each}
	</div>
{:else if !showForm}
	<div class="empty-state">
		<p>{labels.emptyState}</p>
	</div>
{/if}
