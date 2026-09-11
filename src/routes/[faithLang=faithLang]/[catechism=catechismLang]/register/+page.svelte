<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { m, type FaithLang } from '$lib/js/faithI18n';
	import type { RegisterEntry, RegisterRef } from '$lib/faith/cccTypes';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const lang = $derived(data.lang as FaithLang);
	const t = $derived(m[lang]);

	const indexHref = $derived(resolve('/[faithLang=faithLang]/[catechism=catechismLang]', { faithLang: data.faithLang, catechism: data.catechism }));
	const refHref = (ref: RegisterRef) =>
		resolve('/[faithLang=faithLang]/[catechism=catechismLang]/[ref=cccRef]', {
			faithLang: data.faithLang,
			catechism: data.catechism,
			ref: ref.to === ref.from ? String(ref.from) : `${ref.from}-${ref.to}`
		});
	const shown = (ref: RegisterRef) => (ref.to === ref.from ? String(ref.from) : `${ref.from}–${ref.to}`);

	/** The letter an entry files under; anything else goes under "#". */
	const letterOf = (entry: RegisterEntry) => {
		const first = entry.label.replace(/^[^\p{L}]+/u, '').charAt(0).toUpperCase();
		return /\p{L}/u.test(first) ? first : '#';
	};

	const letters = $derived([...new Set(data.entries.map(letterOf))]);
	const grouped = $derived(letters.map((letter) => ({ letter, entries: data.entries.filter((e) => letterOf(e) === letter) })));
</script>

<Seo title={`${t.ccc_register} — ${t.ccc_title}`} description={t.ccc_register_lead} lang={lang} />

<article>
	<p class="up"><a href={indexHref}>{t.ccc_contents}</a></p>
	<h1>{t.ccc_register}</h1>
	<p class="lead">{t.ccc_register_lead}</p>

	{#if data.entries.length === 0}
		<p class="none">{t.ccc_register_none}</p>
	{:else}
		<nav class="letters" aria-label={t.ccc_letter}>
			{#each letters as letter (letter)}<a href="#letter-{letter}">{letter}</a>{/each}
		</nav>

		{#each grouped as group (group.letter)}
			<section>
				<h2 id="letter-{group.letter}">{group.letter}</h2>
				<dl>
					{#each group.entries as entry, i (i)}
						<dt>
							{#if entry.label}<span class="word">{entry.label}</span>{/if}
							{#each entry.refs as ref, r (r)}<a href={refHref(ref)}>{shown(ref)}</a>{#if r < entry.refs.length - 1}<span class="sep">,</span>{/if}{/each}
							{#if entry.see}<span class="see">{t.ccc_see} {entry.see.join(' · ')}</span>{/if}
						</dt>
						{#each entry.lines as sub, s (s)}
							<dd>
								{#if sub.label}<span class="word">{sub.label}</span>{/if}
								{#each sub.refs as ref, r (r)}<a href={refHref(ref)}>{shown(ref)}</a>{#if r < sub.refs.length - 1}<span class="sep">,</span>{/if}{/each}
								{#if sub.see}<span class="see">{t.ccc_see} {sub.see.join(' · ')}</span>{/if}
							</dd>
						{/each}
					{/each}
				</dl>
			</section>
		{/each}
	{/if}
</article>

<style>
	article {
		max-width: 56rem;
		margin-inline: auto;
		padding-block: 1.5rem 4rem;
		padding-inline: 1rem;
	}
	.up {
		margin: 0 0 1.5rem;
		font-size: var(--text-sm);
	}
	.up a {
		color: var(--color-text-secondary);
		text-decoration: none;
	}
	.up a:hover,
	.up a:focus-visible {
		color: var(--color-primary);
	}
	h1 {
		font-size: var(--text-xl);
		margin: 0 0 0.4rem;
	}
	.lead {
		margin: 0 0 1.5rem;
		color: var(--color-text-secondary);
	}
	.none {
		color: var(--color-text-secondary);
	}

	.letters {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		gap: 0.2rem;
		padding: 0.6rem 0;
		margin-bottom: 1rem;
		background: var(--color-bg-primary);
		border-bottom: 1px solid var(--color-border);
	}
	.letters a {
		min-width: 1.7rem;
		padding: 0.15rem 0.35rem;
		text-align: center;
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--text-sm);
	}
	.letters a:hover,
	.letters a:focus-visible {
		background: var(--color-primary);
		color: var(--color-text-on-primary);
	}

	h2 {
		font-size: var(--text-lg);
		margin: 2rem 0 0.5rem;
		color: var(--color-primary);
		scroll-margin-top: 4rem;
	}
	dl {
		margin: 0;
		columns: 2;
		column-gap: 2.5rem;
	}
	dt,
	dd {
		margin: 0 0 0.15rem;
		line-height: 1.45;
		break-inside: avoid;
	}
	dt {
		margin-top: 0.6rem;
		font-weight: 600;
	}
	dd {
		margin-left: 1.2rem;
		font-size: var(--text-sm);
		color: var(--color-text-secondary);
	}
	.word::after {
		content: ':';
		margin-right: 0.35ch;
	}
	dt .word:only-child::after,
	dd .word:only-child::after {
		content: '';
	}
	.sep {
		margin-left: -0.35ch;
		margin-right: 0.2ch;
		color: var(--color-text-tertiary);
	}
	dl a {
		margin-right: 0.4ch;
		color: var(--color-primary);
		text-decoration: none;
		font-variant-numeric: tabular-nums;
	}
	dl a:hover,
	dl a:focus-visible {
		text-decoration: underline;
	}
	.see {
		font-style: italic;
		color: var(--color-text-tertiary);
	}

	@media (max-width: 700px) {
		dl {
			columns: 1;
		}
	}
</style>
