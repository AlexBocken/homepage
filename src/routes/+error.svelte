<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { resolve } from '$app/paths';
  import Header from '$lib/components/Header.svelte';
  import ErrorView from '$lib/components/ErrorView.svelte';
  import { getErrorTitle, getErrorDescription, errorLabels, pick } from '$lib/js/errorStrings';

  let status = $derived(page.status);
  let error = $derived(page.error as any);

  let bibleQuote = $derived(error?.bibleQuote);
  let isEnglish = $derived(error?.lang === 'en');
  let details = $derived(error?.details);

  function goHome() { goto('/'); }
  function goBack() {
    if (window.history.length > 1) window.history.back();
    else goto('/');
  }
</script>

<svelte:head>
  <title>{getErrorTitle(status, isEnglish)} — Alexander's Website</title>
</svelte:head>

<Header>
  {#snippet links()}
    <ul class="site_header"></ul>
  {/snippet}

  <ErrorView
    {status}
    title={getErrorTitle(status, isEnglish)}
    description={getErrorDescription(status, isEnglish)}
    {details}
    {bibleQuote}
    {isEnglish}
  >
    {#snippet actions()}
      {#if status === 401}
        <!-- Full navigation (an <a>, not goto): /login is a server endpoint that 302s
             straight to Authentik; an SPA nav would only tear the page down and flash
             blank before the hard redirect. -->
        <a class="link link-primary" href={`${resolve('/login')}?callbackUrl=${encodeURIComponent(page.url.pathname + (browser ? page.url.search : ''))}`}>{pick(errorLabels.login, isEnglish)}</a>
        <button class="link" onclick={goHome}>{pick(errorLabels.homepage, isEnglish)}</button>
      {:else if status === 500}
        <button class="link link-primary" onclick={goBack}>{pick(errorLabels.tryAgain, isEnglish)}</button>
        <button class="link" onclick={goHome}>{pick(errorLabels.homepage, isEnglish)}</button>
      {:else}
        <button class="link link-primary" onclick={goHome}>{pick(errorLabels.homepage, isEnglish)}</button>
        <button class="link" onclick={goBack}>{pick(errorLabels.goBack, isEnglish)}</button>
      {/if}
    {/snippet}
  </ErrorView>
</Header>
