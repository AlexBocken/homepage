<script lang="ts">
  import { page } from '$app/stores';
  import SectionError from '$lib/components/SectionError.svelte';

  let faithLang = $derived($page.params.faithLang);
  let isEnglish = $derived(faithLang === 'faith');
</script>

<SectionError
  sectionHref="/{faithLang}"
  sectionLabel={{ en: 'Faith', de: 'Glaube' }}
  {isEnglish}
/>
