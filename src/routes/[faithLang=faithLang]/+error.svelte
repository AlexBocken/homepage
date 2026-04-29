<script lang="ts">
  import { resolve } from '$app/paths';
  import SectionError from '$lib/components/SectionError.svelte';
  import { page } from '$app/stores';

  let faithLang = $derived($page.params.faithLang!);
  let isEnglish = $derived(faithLang === 'faith');
  let sectionLabel = $derived(
    faithLang === 'fides'
      ? { en: 'Fides', de: 'Fides' }
      : { en: 'Faith', de: 'Glaube' }
  );
</script>

<SectionError
  sectionHref={resolve('/[faithLang=faithLang]', { faithLang })}
  {sectionLabel}
  {isEnglish}
/>
