<script lang="ts">
  import { page } from '$app/stores';
  import SectionError from '$lib/components/SectionError.svelte';

  let recipeLang = $derived($page.params.recipeLang);
  let isEnglish = $derived(recipeLang === 'recipes');
</script>

<SectionError
  sectionHref="/{recipeLang}"
  sectionLabel={{ en: 'Recipes', de: 'Rezepte' }}
  {isEnglish}
/>
