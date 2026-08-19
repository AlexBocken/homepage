<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { onMount } from 'svelte';
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

	// ── The review loop, for real ──────────────────────────────────────────────
	// Anki has exactly one characteristic artifact and one characteristic idea: a
	// card you answer, and gaps between reviews that grow. Rather than describe
	// either, the page hands you the first and lets it drive the second. The grade
	// buttons are the ones study.bocken.org uses, in the same Nord colours, so this
	// is a preview of the real thing and not an illustration of it.

	// Minutes, because the ladder's widths are computed from them.
	const LADDER = $derived([
		{ minutes: 10, label: t.anki_int_10m },
		{ minutes: 60 * 24, label: t.anki_int_1d },
		{ minutes: 60 * 24 * 4, label: t.anki_int_4d },
		{ minutes: 60 * 24 * 10, label: t.anki_int_10d },
		{ minutes: 60 * 24 * 30, label: t.anki_int_1mo },
		{ minutes: 60 * 24 * 90, label: t.anki_int_3mo }
	]);

	// Real cards from three of the decks below, so answering doubles as a preview.
	const CARDS = $derived([
		{ deck: 'kanji', front: '山', back: t.anki_demo_kanji_back, sub: 'やま · サン', script: 'ja' },
		{ deck: 'breVIA', front: 'amicus', back: t.anki_demo_brevia_back, sub: t.anki_demo_brevia_sub, script: '' },
		{ deck: 'SwissMountain', front: 'Dufourspitze', back: '4634 m', sub: t.anki_demo_mountain_sub, script: '' }
	]);

	// Only after mount: server-rendered, the card is a specimen with both sides
	// showing and no controls, so nothing on the page is a button that does nothing.
	let interactive = $state(false);
	let step = $state(0);
	let index = $state(0);
	let revealed = $state(false);
	let lastGap = $state<string | null>(null);

	const card = $derived(CARDS[index % CARDS.length]);
	// Walking the whole ladder is the demo's ending: past the last rung the grades
	// would all read "3 months" and answering would stop meaning anything.
	const atEnd = $derived(interactive && step === LADDER.length - 1);

	// Anki's own shape, not its exact arithmetic: Again drops to the first step,
	// Good takes one, Easy takes two, Hard holds where it is.
	function grade(next: number) {
		step = Math.max(0, Math.min(next, LADDER.length - 1));
		lastGap = LADDER[step].label;
		revealed = false;
		index = (index + 1) % CARDS.length;
	}

	function restart() {
		step = 0;
		index = 0;
		revealed = false;
		lastGap = null;
	}

	onMount(() => {
		interactive = true;
	});

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

		<div class="demo">
			<!-- The card. Answering it advances to the next one, which is what a review
			     session does anyway, so three decks get previewed without a carousel. -->
			<figure class="flashcard" class:live={interactive} class:done={atEnd}>
				{#if atEnd}
					<div class="face done-title">{t.anki_demo_done_title}</div>
					<p class="done-body">{t.anki_demo_done_body}</p>
					<div class="done-actions">
						<a class="cta small" href={STUDY_URL}>
							{t.anki_study_cta}
							<ExternalLink size={14} strokeWidth={2} />
						</a>
						<button type="button" class="restart" onclick={restart}>{t.anki_demo_restart}</button>
					</div>
				{:else}
				<figcaption>
					{#if interactive}<span class="try">{t.anki_demo_label}</span>{/if}
					<span class="from">{t.anki_demo_from} <strong>{card.deck}</strong></span>
				</figcaption>

				<div class="face" lang={card.script || undefined}>{card.front}</div>

				{#if !interactive || revealed}
					<hr />
					<div class="face back">{card.back}</div>
					<div class="sub">{card.sub}</div>
				{/if}

				{#if interactive}
					{#if revealed}
						<div class="grades">
							<button type="button" class="g again" onclick={() => grade(0)}>
								<span>{t.anki_grade_again}</span><small>{LADDER[0].label}</small>
							</button>
							<button type="button" class="g hard" onclick={() => grade(step)}>
								<span>{t.anki_grade_hard}</span><small>{LADDER[step].label}</small>
							</button>
							<button type="button" class="g good" onclick={() => grade(step + 1)}>
								<span>{t.anki_grade_good}</span>
								<small>{LADDER[Math.min(step + 1, LADDER.length - 1)].label}</small>
							</button>
							<button type="button" class="g easy" onclick={() => grade(step + 2)}>
								<span>{t.anki_grade_easy}</span>
								<small>{LADDER[Math.min(step + 2, LADDER.length - 1)].label}</small>
							</button>
						</div>
					{:else}
						<button type="button" class="reveal" onclick={() => (revealed = true)}>
							{t.anki_demo_show}
						</button>
					{/if}
				{/if}
				{/if}
			</figure>

			<!-- The ladder. Segment widths are proportional to log2 of the interval, so
			     the widening you see is the schedule itself rather than decoration. The
			     floor keeps the shortest step wide enough to hold its own label. -->
			<div class="ladder">
				<h3>{t.anki_ladder_title}</h3>
				<ol style="--cols: {LADDER.map((s) => `minmax(var(--rung-min), ${Math.log2(s.minutes).toFixed(2)}fr)`).join(' ')}">
					{#each LADDER as rung, i (rung.minutes)}
						<li class:on={interactive && i === step} class:past={interactive && i < step}>
							<span class="bar"></span>
							<span class="tick">{rung.label}</span>
						</li>
					{/each}
				</ol>
				<p class="ladder-note">
					{t.anki_ladder_note}
					{#if interactive && lastGap}
						<strong class="gap">{t.anki_demo_next_in} {lastGap}.</strong>
					{/if}
				</p>
			</div>
		</div>

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


	/* ── The review loop ──────────────────────────────────────────────────────
	   The card and the ladder are one unit: the card is the cause, the ladder is
	   the effect, so they sit side by side and stack in that order on a phone. */
	.demo {
		display: grid;
		grid-template-columns: minmax(0, 20rem) minmax(0, 1fr);
		gap: 1.5rem;
		align-items: start;
		margin: 0.4rem 0 0.2rem;
	}

	.flashcard {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 0;
		padding: 1.1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-bg-primary);
		text-align: center;
	}
	.flashcard figcaption {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
		text-align: start;
	}
	.try {
		padding: 0.1rem 0.5rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-elevated);
		font-weight: 600;
	}
	.from strong {
		font-weight: 600;
	}
	.face {
		font-size: 1.9rem;
		line-height: 1.25;
		padding: 0.6rem 0;
	}
	.face[lang='ja'] {
		font-size: 3.2rem;
	}
	.back {
		font-size: 1.5rem;
	}
	.sub {
		margin-top: -0.4rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.flashcard hr {
		width: 100%;
		margin: 0;
		border: 0;
		border-top: 1px solid var(--color-border);
	}

	.reveal {
		padding: 0.6rem 1rem;
		border: none;
		border-radius: var(--radius-pill);
		background: var(--color-primary);
		color: var(--color-text-on-primary);
		font-weight: 600;
		font-size: var(--text-sm);
		cursor: pointer;
		transition: background var(--transition-normal);
	}
	.reveal:hover {
		background: var(--color-primary-hover);
	}

	/* The same four grades study.bocken.org uses, in the same Nord colours and with
	   the same dark ink — Nord's accents are built to carry it, and it keeps the
	   demo honest about what the real thing looks like. */
	.grades {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 0.3rem;
	}
	.g {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.05rem;
		padding: 0.45rem 0.2rem;
		border: none;
		border-radius: var(--radius-pill);
		color: var(--nord0);
		font-weight: 600;
		font-size: 0.78rem;
		cursor: pointer;
		transition: filter var(--transition-normal), scale var(--transition-fast);
	}
	.g small {
		font-weight: 400;
		font-size: 0.68rem;
		opacity: 0.75;
	}
	.g:hover {
		filter: brightness(1.06);
	}
	.g:active {
		scale: 0.97;
	}
	.again { background: var(--red); }
	.hard { background: var(--yellow); }
	.good { background: var(--green); }
	.easy { background: var(--nord8); }

	.done-title {
		padding-top: 0.4rem;
		font-size: 1.25rem;
		font-weight: 600;
		padding-bottom: 0;
	}
	.done-body {
		margin: 0;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
		text-align: center;
	}
	.done-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
	}
	.cta.small {
		align-self: center;
		padding: 0.5rem 1rem;
		font-size: var(--text-sm);
	}
	.restart {
		padding: 0.5rem 1rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--color-text-secondary);
		font-size: var(--text-sm);
		cursor: pointer;
		transition: border-color var(--transition-normal), color var(--transition-normal);
	}
	.restart:hover {
		border-color: var(--color-border-hover);
		color: var(--color-text-primary);
	}

	.ladder h3 {
		margin: 0 0 0.7rem;
		font-size: var(--text-base);
	}
	.ladder ol {
		/* The floor keeps the shortest rung wide enough for its own label; on a phone
		   six of them at the desktop floor are wider than the screen. */
		--rung-min: 3.4rem;
		display: grid;
		grid-template-columns: var(--cols);
		gap: 0.25rem;
		margin: 0 0 0.7rem;
		padding: 0;
		list-style: none;
	}
	.ladder li {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}
	.bar {
		height: 0.5rem;
		border-radius: var(--radius-pill);
		background: var(--color-bg-elevated);
		transition: background var(--transition-normal);
	}
	.past .bar {
		background: var(--color-primary-hover);
	}
	.on .bar {
		background: var(--color-primary);
	}
	.tick {
		font-size: 0.72rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.on .tick {
		color: var(--color-text-primary);
		font-weight: 600;
	}
	.ladder-note {
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.gap {
		color: var(--color-text-primary);
	}

	@media (max-width: 720px) {
		.demo {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (max-width: 560px) {
		.ladder ol {
			--rung-min: 2.2rem;
			gap: 0.15rem;
		}
		.tick {
			/* Wrapping beats an ellipsis here: the narrowest rung is also the one the
			   card starts on, so it is the label most likely to be read. */
			font-size: 0.65rem;
			white-space: normal;
			overflow: visible;
			line-height: 1.15;
		}
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
		.decks a:hover,
		.g:active {
			scale: 1;
		}
	}
</style>
