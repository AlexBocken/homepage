<script lang="ts">
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import SectionError from '$lib/components/SectionError.svelte';
  import { detectCospendLang, cospendRoot } from '$lib/js/cospendI18n';

  let lang = $derived(detectCospendLang(page.url.pathname));
  let isEnglish = $derived(lang === 'en');
</script>

<SectionError
  sectionHref={resolve('/[cospendRoot=cospendRoot]', { cospendRoot: cospendRoot(lang) })}
  sectionLabel={{ en: 'Expenses', de: 'Kosten' }}
  {isEnglish}
/>
