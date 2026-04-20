<script lang="ts">
  import { page } from '$app/stores';
  import SectionError from '$lib/components/SectionError.svelte';
  import { detectFitnessLang } from '$lib/js/fitnessI18n';

  let lang = $derived(detectFitnessLang($page.url.pathname));
  let isEnglish = $derived(lang === 'en');
</script>

<SectionError
  sectionHref={isEnglish ? '/fitness/workout' : '/fitness/training'}
  sectionLabel={{ en: 'Fitness', de: 'Fitness' }}
  {isEnglish}
/>
