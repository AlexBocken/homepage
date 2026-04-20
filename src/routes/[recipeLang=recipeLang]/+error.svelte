<script lang="ts">
  import SectionError from '$lib/components/SectionError.svelte';
  import { page } from '$app/stores';

  let recipeLang = $derived($page.params.recipeLang);
  let isEnglish = $derived(recipeLang === 'recipes');
</script>

<SectionError
  sectionHref="/{recipeLang}"
  sectionLabel={{ en: 'Recipes', de: 'Rezepte' }}
  {isEnglish}
/>
