<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props<{ data: PageData }>();

	const isEnglish = data.lang === 'en';
	const pageTitle = isEnglish ? 'Administration' : 'Administration';
	const pageDescription = isEnglish
		? 'Manage recipes and content'
		: 'Rezepte und Inhalte verwalten';

	const links = [
		{
			title: isEnglish ? 'Untranslated Recipes' : 'Unübersetzte Rezepte',
			description: isEnglish
				? 'View and manage recipes that need translation'
				: 'Rezepte ansehen und verwalten, die übersetzt werden müssen',
			href: `/${data.recipeLang}/admin/untranslated`,
			icon: '🌐'
		},
		{
			title: isEnglish ? 'Alt-Text Generator' : 'Alt-Text Generator',
			description: isEnglish
				? 'Generate alternative text for recipe images using AI'
				: 'Alternativtext für Rezeptbilder mit KI generieren',
			href: `/${data.recipeLang}/admin/alt-text-generator`,
			icon: '🖼️'
		}
	];
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
	color: var(--nord3);
}
.admin-container {
	max-width: 1000px;
	margin: 2rem auto;
	padding: 1.5rem;
}
.admin-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
	gap: 2rem;
	margin-top: 2rem;
}
.admin-card {
	background: var(--nord1);
	border-radius: 8px;
	padding: 2rem;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
	transition: transform 200ms, box-shadow 200ms;
	text-decoration: none;
	color: inherit;
	display: flex;
	flex-direction: column;
	gap: 1rem;
}
.admin-card:hover,
.admin-card:focus {
	transform: translateY(-4px);
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	background: hsl(from var(--nord1) h calc(s * 1.1) calc(l * 1.05));
}
.admin-card-icon {
	font-size: 3rem;
	text-align: center;
}
.admin-card-title {
	font-size: 1.5rem;
	font-weight: bold;
	margin: 0;
	text-align: center;
}
.admin-card-description {
	font-size: 1rem;
	color: var(--nord4);
	text-align: center;
	margin: 0;
}
@media(prefers-color-scheme: light) {
	.admin-card {
		background: var(--nord6);
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}
	.admin-card:hover,
	.admin-card:focus {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		background: hsl(from var(--nord6) h calc(s * 1.1) calc(l * 0.98));
	}
	.admin-card-description {
		color: var(--nord2);
	}
	.subheading {
		color: var(--nord2);
	}
}
</style>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>

<h1>{pageTitle}</h1>
<p class="subheading">{pageDescription}</p>

<div class="admin-container">
	<div class="admin-grid">
		{#each links as link (link.href)}
			<a href={link.href} class="admin-card">
				<div class="admin-card-icon">{link.icon}</div>
				<h2 class="admin-card-title">{link.title}</h2>
				<p class="admin-card-description">{link.description}</p>
			</a>
		{/each}
	</div>
</div>
