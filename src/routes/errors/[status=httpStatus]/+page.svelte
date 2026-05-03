<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import Lock from '@lucide/svelte/icons/lock';
  import Ban from '@lucide/svelte/icons/ban';
  import SearchX from '@lucide/svelte/icons/search-x';
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import { getErrorTitle, getErrorDescription, getErrorBibleQuote } from '$lib/js/errorStrings';

  let { data } = $props();
  const status = data.status;

  const Icon = (() => {
    switch (status) {
      case 401: return Lock;
      case 403: return Ban;
      case 404: return SearchX;
      case 500: return TriangleAlert;
      default: return CircleAlert;
    }
  })();

  const titleDe = getErrorTitle(status, false);
  const titleEn = getErrorTitle(status, true);
  const descDe = getErrorDescription(status, false);
  const descEn = getErrorDescription(status, true);
  const quoteDe = getErrorBibleQuote(status, false);
  const quoteEn = getErrorBibleQuote(status, true);
</script>

<svelte:head>
  <title>{titleDe} — Alexander's Website</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<Header>
  {#snippet links()}
    <ul class="site_header"></ul>
  {/snippet}

  {#snippet language_selector_desktop()}
    <button id="lang-toggle" type="button" class="lang-toggle" aria-label="Switch language">EN</button>
  {/snippet}

  <main class="error-page">
    <article class="error-article">
      <header class="eyebrow">
        <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
        <span class="eyebrow-label" data-lang="de">Fehler</span>
        <span class="eyebrow-label" data-lang="en">Error</span>
      </header>

      <div class="code" aria-hidden="true">{status}</div>

      <section data-lang="de" lang="de">
        <h1 class="title">{titleDe}</h1>
        <p class="description">{descDe}</p>
        {#if quoteDe}
          <figure class="quote">
            <blockquote class="quote-text">„{quoteDe.text}“</blockquote>
            <figcaption class="quote-reference">{quoteDe.reference}</figcaption>
          </figure>
        {/if}
      </section>

      <section data-lang="en" lang="en">
        <h1 class="title">{titleEn}</h1>
        <p class="description">{descEn}</p>
        {#if quoteEn}
          <figure class="quote">
            <blockquote class="quote-text">“{quoteEn.text}”</blockquote>
            <figcaption class="quote-reference">{quoteEn.reference}</figcaption>
          </figure>
        {/if}
      </section>
    </article>
  </main>
</Header>

<style>
  /* Visibility driven by <html data-lang="…">, set by an inline script
     injected by scripts/build-error-page.ts. Default-language fallback
     (no JS / no localStorage) shows German. */
  :global(html[data-lang="de"]) [data-lang="en"] { display: none; }
  :global(html[data-lang="en"]) [data-lang="de"] { display: none; }
  :global(html:not([data-lang])) [data-lang="en"] { display: none; }

  .error-page {
    min-height: calc(100vh - 6rem);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: clamp(3rem, 10vh, 8rem) 1.5rem 4rem;
    background: var(--color-bg-primary);
  }

  .error-article {
    width: 100%;
    max-width: 640px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-text-tertiary);
    margin-bottom: 1rem;
  }

  .eyebrow-label {
    font-size: 0.75rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .code {
    font-size: clamp(7rem, 22vw, 14rem);
    font-weight: 200;
    line-height: 0.9;
    letter-spacing: -0.05em;
    color: var(--color-text-primary);
    margin: 0 0 2rem;
    font-variant-numeric: lining-nums tabular-nums;
  }

  .title {
    font-size: clamp(1.5rem, 3vw, 2rem);
    font-weight: 500;
    letter-spacing: -0.01em;
    color: var(--color-text-primary);
    margin: 0 0 0.5rem;
  }

  .description {
    font-size: 1.0625rem;
    line-height: 1.55;
    color: var(--color-text-secondary);
    margin: 0;
    max-width: 44ch;
  }

  .quote {
    margin: 2rem 0 0;
    padding-left: 1rem;
    border-left: 2px solid var(--color-border);
    max-width: 44ch;
  }

  .quote-text {
    font-family: Georgia, "Times New Roman", Cambria, serif;
    font-style: italic;
    font-size: 1.0625rem;
    line-height: 1.5;
    color: var(--color-text-primary);
    margin: 0 0 0.5rem;
    text-wrap: balance;
    hyphens: auto;
  }

  .quote-reference {
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
  }

  .lang-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2rem;
    height: 1.85rem;
    padding: 0 0.6rem;
    border-radius: 100px;
    border: 1px solid var(--nav-btn-border, rgba(255,255,255,0.2));
    background: transparent;
    color: var(--nav-text, #999);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.15s;
  }
  .lang-toggle:hover,
  .lang-toggle:focus-visible {
    color: var(--nav-text-hover, white);
    background: var(--nav-hover-bg, rgba(255,255,255,0.1));
    border-color: var(--nav-btn-border-hover, rgba(255,255,255,0.4));
  }
</style>
