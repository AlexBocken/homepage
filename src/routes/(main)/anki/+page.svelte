<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { languageStore } from '$lib/stores/language.svelte';
	import { m } from '$lib/js/commonI18n';
	import GraduationCap from '@lucide/svelte/icons/graduation-cap';
	import Brain from '@lucide/svelte/icons/brain';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import Layers from '@lucide/svelte/icons/layers';
	import MonitorSmartphone from '@lucide/svelte/icons/monitor-smartphone';
	import Smartphone from '@lucide/svelte/icons/smartphone';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Check from '@lucide/svelte/icons/check';
	import Copy from '@lucide/svelte/icons/copy';

	const lang = $derived(languageStore.value);
	const t = $derived(m[lang]);
	const isEnglish = $derived(lang === 'en');

	const SYNC_URL = 'https://anki.bocken.org/';
	const STUDY_URL = 'https://study.bocken.org';
	const OWNER = 'AlexBocken';
	const GITHUB = `https://github.com/${OWNER}`;

	const settingsUrl = $derived(isEnglish ? '/settings' : '/einstellungen');

	// Grouped by subject rather than alphabetically, and the two Japanese decks lead
	// because they are the ones with the most work in them. `owner` is only set
	// where the repository is not mine.
	const decks = $derived([
		{ name: 'kanji', repo: 'kanji', tag: '日本語', desc: t.anki_deck_kanji },
		{ name: 'KanjiLesungen', repo: 'KanjiLesungen', tag: '日本語', desc: t.anki_deck_kanjilesungen },
		{ name: 'gaido', repo: 'gaido', tag: '日本語', desc: t.anki_deck_gaido },
		{ name: 'breVIA', repo: 'breVIA', tag: 'Latina', desc: t.anki_deck_brevia },
		{ name: 'AVL', repo: 'AVL', tag: 'English', desc: t.anki_deck_avl },
		{ name: 'GRE', repo: 'GRE', tag: 'English', desc: t.anki_deck_gre },
		{
			name: 'SwissMountain',
			repo: 'SwissMountain',
			owner: 'TillDiem',
			tag: isEnglish ? 'Geography' : 'Geografie',
			desc: t.anki_deck_swissmountain
		},
		{ name: 'birds', repo: 'birds', tag: isEnglish ? 'Nature' : 'Natur', desc: t.anki_deck_birds }
	]);

	let copied = $state(false);
	let copyTimer: ReturnType<typeof setTimeout>;

	async function copySyncUrl() {
		try {
			await navigator.clipboard.writeText(SYNC_URL);
			copied = true;
			clearTimeout(copyTimer);
			copyTimer = setTimeout(() => (copied = false), 2000);
		} catch {
			/* no clipboard permission: the URL is right there to select by hand */
		}
	}
</script>

<Seo
	title={isEnglish ? 'Anki — bocken.org' : 'Anki — bocken.org'}
	description={isEnglish
		? 'Study Anki flashcards in the browser at study.bocken.org, sync your collection against anki.bocken.org, and download my own decks for Japanese, Latin, English vocabulary and birdsong.'
		: 'Anki-Karteikarten im Browser auf study.bocken.org lernen, die eigene Sammlung über anki.bocken.org synchronisieren und meine eigenen Stapel für Japanisch, Latein, englische Vokabeln und Vogelstimmen herunterladen.'}
	canonical="https://bocken.org/anki"
	siteName="Bocken"
	lang={isEnglish ? 'en' : 'de'}
/>

<div class="page">
	<header class="intro">
		<h1>{t.anki_title}</h1>
		<p class="lede">{t.anki_lede}</p>
	</header>

	<!-- The thing most people came for, so it goes first and looks like it. -->
	<section class="card feature">
		<div class="head">
			<span class="icon primary"><GraduationCap size={20} /></span>
			<h2>{t.anki_study_title}</h2>
		</div>
		<p>{t.anki_study_desc}</p>
		<a class="cta" href={STUDY_URL}>
			{t.anki_study_cta}
			<ExternalLink size={16} strokeWidth={2} />
		</a>
		<p class="note">
			{t.anki_study_note}
			<a href={settingsUrl}>{t.anki_sync_settings_link}</a>
		</p>
	</section>

	<section class="card">
		<div class="head">
			<span class="icon"><Brain size={20} /></span>
			<h2>{t.anki_what_title}</h2>
		</div>
		<p>{t.anki_what_1}</p>
		<p>{t.anki_what_2}</p>
		<a class="plain" href="https://apps.ankiweb.net">
			{t.anki_what_link}
			<ExternalLink size={14} strokeWidth={2} />
		</a>
	</section>

	<section class="card">
		<div class="head">
			<span class="icon"><RefreshCw size={20} /></span>
			<h2>{t.anki_sync_title}</h2>
		</div>
		<p>{t.anki_sync_desc}</p>

		<div class="url-row">
			<code>{SYNC_URL}</code>
			<button type="button" onclick={copySyncUrl}>
				{#if copied}<Check size={14} />{:else}<Copy size={14} />{/if}
				{copied ? t.settings_anki_copied : t.settings_anki_copy}
			</button>
		</div>

		<ol class="steps">
			<li>
				<span class="step-icon"><MonitorSmartphone size={16} /></span>
				<div>
					<h3>{t.anki_sync_desktop}</h3>
					<p>{t.anki_sync_desktop_steps}</p>
				</div>
			</li>
			<li>
				<span class="step-icon"><Smartphone size={16} /></span>
				<div>
					<h3>{t.anki_sync_mobile}</h3>
					<p>{t.anki_sync_mobile_steps}</p>
				</div>
			</li>
		</ol>

		<p>{t.anki_sync_login}</p>
		<p class="note">{t.anki_sync_ankiweb_note}</p>
		<p class="note">
			{t.anki_sync_group}
			<a href={settingsUrl}>{t.anki_sync_settings_link}</a>
		</p>
	</section>

	<section>
		<div class="head decks-head">
			<span class="icon"><Layers size={20} /></span>
			<h2>{t.anki_decks_title}</h2>
		</div>
		<p class="decks-desc">{t.anki_decks_desc}</p>

		<ul class="decks">
			{#each decks as deck (deck.repo)}
				<li>
					<a href="https://github.com/{deck.owner ?? OWNER}/{deck.repo}">
						<div class="deck-head">
							<h3>{deck.name}</h3>
							<span class="tag">{deck.tag}</span>
						</div>
						<p>{deck.desc}</p>
					</a>
				</li>
			{/each}
		</ul>

		<a class="plain" href={GITHUB}>
			{t.anki_decks_all}
			<ExternalLink size={14} strokeWidth={2} />
		</a>
	</section>
</div>

<style>
	.page {
		max-width: 1000px;
		margin-inline: auto;
		padding: 1rem 1rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.intro h1 {
		margin: 0 0 0.5rem;
		font-size: var(--text-2xl);
	}
	.lede {
		margin: 0;
		max-width: 60ch;
		color: var(--color-text-secondary);
		line-height: 1.6;
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-card);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	/* The one section that is a call to action rather than a reference. */
	.feature {
		border-color: var(--color-primary);
		box-shadow: var(--shadow-sm);
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.7rem;
	}
	.head h2 {
		margin: 0;
		font-size: var(--text-xl);
	}
	.icon {
		display: grid;
		place-items: center;
		width: 2.2rem;
		height: 2.2rem;
		flex: 0 0 auto;
		border-radius: 1000px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}
	.icon.primary {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}

	p {
		margin: 0;
		max-width: 65ch;
		line-height: 1.6;
	}
	.note {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}

	.cta {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 1.4rem;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		text-decoration: none;
		font-weight: 600;
		transition: background var(--transition-normal), scale var(--transition-fast);
	}
	.cta:hover {
		background: var(--color-primary-hover);
		scale: 1.02;
	}

	.plain {
		align-self: flex-start;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--color-link);
		font-size: var(--text-sm);
	}
	.plain:hover {
		color: var(--color-link-hover);
	}

	.url-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6rem;
	}
	.url-row code {
		padding: 0.5rem 0.8rem;
		border-radius: var(--radius-md);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		font-size: var(--text-base);
		user-select: all;
	}
	.url-row button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.5rem 0.9rem;
		border-radius: var(--radius-pill);
		border: 1px solid var(--color-border);
		background: var(--color-bg-secondary);
		color: var(--color-text-primary);
		cursor: pointer;
		font-size: var(--text-sm);
		transition: background var(--transition-normal), border-color var(--transition-normal);
	}
	.url-row button:hover {
		background: var(--color-bg-elevated);
		border-color: var(--color-border-hover);
	}

	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}
	.steps li {
		display: flex;
		gap: 0.7rem;
		align-items: flex-start;
	}
	.step-icon {
		display: grid;
		place-items: center;
		width: 1.8rem;
		height: 1.8rem;
		flex: 0 0 auto;
		border-radius: 1000px;
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
	}
	.steps h3 {
		margin: 0 0 0.15rem;
		font-size: var(--text-base);
	}
	.steps p {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	.decks-head {
		margin-bottom: 0.7rem;
	}
	.decks-desc {
		margin-bottom: 1.2rem;
		color: var(--color-text-secondary);
	}
	.decks {
		list-style: none;
		margin: 0 0 1.2rem;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 1rem;
	}
	.decks a {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		height: 100%;
		padding: 1.1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: inherit;
		text-decoration: none;
		transition: scale var(--transition-fast), box-shadow var(--transition-normal),
			border-color var(--transition-normal);
	}
	.decks a:hover {
		scale: 1.02;
		box-shadow: var(--shadow-sm);
		border-color: var(--color-border-hover);
	}
	.deck-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.deck-head h3 {
		margin: 0;
		font-size: var(--text-lg);
	}
	.tag {
		flex: 0 0 auto;
		padding: 0.15rem 0.6rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-tertiary);
		color: var(--color-text-secondary);
		font-size: 0.75rem;
	}
	.decks p {
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
	}

	@media (max-width: 560px) {
		.page {
			gap: 1.5rem;
		}
		.card {
			padding: 1.1rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cta:hover,
		.decks a:hover {
			scale: 1;
		}
	}
</style>
