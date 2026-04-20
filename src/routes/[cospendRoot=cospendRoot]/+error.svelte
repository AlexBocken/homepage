<script lang="ts">
  import { page } from '$app/stores';
  import SectionError from '$lib/components/SectionError.svelte';
  import { detectCospendLang, cospendRoot } from '$lib/js/cospendI18n';

  let lang = $derived(detectCospendLang($page.url.pathname));
  let isEnglish = $derived(lang === 'en');
</script>

<SectionError
  sectionHref={cospendRoot(lang)}
  sectionLabel={{ en: 'Expenses', de: 'Kosten' }}
  {isEnglish}
/>
