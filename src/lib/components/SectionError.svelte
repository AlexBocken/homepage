<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import ErrorView from './ErrorView.svelte';
  import { getErrorTitle, getErrorDescription, errorLabels, pick } from '$lib/js/errorStrings';
  import type { Snippet } from 'svelte';

  interface Props {
    /** Destination of the section's primary "home" link, e.g. "/rezepte" */
    sectionHref: string;
    /** Label for that link in both languages */
    sectionLabel: { en: string; de: string };
    /** Override language detection (defaults to error.lang from handleError) */
    isEnglish?: boolean;
    /** Extra action buttons rendered before the defaults */
    extraActions?: Snippet;
  }

  let { sectionHref, sectionLabel, isEnglish: isEnglishProp, extraActions }: Props = $props();

  let status = $derived($page.status);
  let error = $derived($page.error as any);
  let bibleQuote = $derived(error?.bibleQuote);
  let detectedEnglish = $derived(error?.lang === 'en');
  let isEnglish = $derived(isEnglishProp ?? detectedEnglish);
  let details = $derived(error?.details);

  let label = $derived(pick(sectionLabel, isEnglish));

  function goBack() {
    if (window.history.length > 1) window.history.back();
    else goto(sectionHref);
  }
  function login() { goto('/login'); }
</script>

<ErrorView
  {status}
  title={getErrorTitle(status, isEnglish)}
  description={getErrorDescription(status, isEnglish)}
  {details}
  {bibleQuote}
  {isEnglish}
>
  {#snippet actions()}
    {#if extraActions}{@render extraActions()}{/if}

    {#if status === 401}
      <button class="link link-primary" onclick={login}>{pick(errorLabels.login, isEnglish)}</button>
      <a class="link" href={sectionHref}>{label}</a>
    {:else if status === 500}
      <button class="link link-primary" onclick={goBack}>{pick(errorLabels.tryAgain, isEnglish)}</button>
      <a class="link" href={sectionHref}>{label}</a>
    {:else}
      <a class="link link-primary" href={sectionHref}>{label}</a>
      <button class="link" onclick={goBack}>{pick(errorLabels.goBack, isEnglish)}</button>
    {/if}
  {/snippet}
</ErrorView>
