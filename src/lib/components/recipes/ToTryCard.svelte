<script>
	let { item, ondelete, onedit, isEnglish = false } = $props();

	function getDomain(url) {
		try {
			return new URL(url).hostname.replace(/^www\./, '');
		} catch {
			return url;
		}
	}
</script>

<style>
.card {
	position: relative;
	display: flex;
	flex-direction: column;
	border-radius: var(--radius-card);
	overflow: hidden;
	background: var(--color-surface);
	box-shadow: 0 1px 4px rgba(0,0,0,0.08);
	transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}
.card:hover,
.card:focus-within {
	transform: translateY(-5px);
	box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.accent {
	height: 6px;
	background: linear-gradient(90deg, var(--nord10), var(--nord9));
}
.body {
	padding: 0.8em 0.9em 0.6em;
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 0.5em;
}
.name {
	font-size: 1.1rem;
	font-weight: 600;
	line-height: 1.3;
	margin: 0;
}
.links {
	display: flex;
	flex-wrap: wrap;
	gap: 0.35em;
}
.link-pill {
	font-size: 0.78rem;
	padding: 0.15rem 0.55rem;
	border-radius: var(--radius-pill);
	background-color: var(--nord5);
	color: var(--nord3);
	text-decoration: none;
	box-shadow: var(--shadow-sm);
	transition: transform var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast), color var(--transition-fast);
}
.link-pill:hover,
.link-pill:focus-visible {
	transform: scale(1.05);
	background-color: var(--nord8);
	box-shadow: var(--shadow-hover);
	color: var(--nord0);
}
@media (prefers-color-scheme: dark) {
	.link-pill {
		background-color: var(--nord0);
		color: var(--nord4);
	}
	.link-pill:hover,
	.link-pill:focus-visible {
		background-color: var(--nord8);
		color: var(--nord0);
	}
}
.notes {
	font-size: 0.85rem;
	color: var(--nord3);
	margin: 0;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
@media (prefers-color-scheme: dark) {
	.notes {
		color: var(--nord4);
	}
}
.footer {
	font-size: 0.72rem;
	color: var(--nord3);
	margin-top: auto;
	padding-top: 0.3em;
}
@media (prefers-color-scheme: dark) {
	.footer {
		color: var(--nord4);
	}
}
.card-btn {
	position: absolute;
	top: 0.5em;
	background: var(--nord11);
	color: white;
	border: none;
	border-radius: var(--radius-pill);
	width: 1.6em;
	height: 1.6em;
	font-size: 0.85rem;
	cursor: pointer;
	display: grid;
	place-items: center;
	opacity: 0;
	transition: opacity var(--transition-fast);
	z-index: 2;
}
.card:hover .card-btn,
.card:focus-within .card-btn {
	opacity: 1;
}
.delete-btn {
	right: 0.5em;
}
.delete-btn:hover {
	background: var(--nord12);
}
.edit-btn {
	right: 2.4em;
	background: var(--nord10);
}
.edit-btn:hover {
	background: var(--nord9);
}
</style>

<div class="card">
	<div class="accent"></div>
	<button class="card-btn edit-btn" onclick={() => onedit(item)} aria-label={isEnglish ? 'Edit' : 'Bearbeiten'}>✎</button>
	<button class="card-btn delete-btn" onclick={() => ondelete(item._id)} aria-label={isEnglish ? 'Delete' : 'Löschen'}>✕</button>
	<div class="body">
		<p class="name">{item.name}</p>
		{#if item.links?.length}
			<div class="links">
				{#each item.links as link (link.url)}
					<a class="link-pill g-pill" href={link.url} target="_blank" rel="noopener noreferrer">
						{link.label || getDomain(link.url)}
					</a>
				{/each}
			</div>
		{/if}
		{#if item.notes}
			<p class="notes">{item.notes}</p>
		{/if}
		<div class="footer">
			{isEnglish ? 'Added by' : 'Hinzugefügt von'} {item.addedBy}
		</div>
	</div>
</div>
