<script lang="ts">
  import { resolve } from '$app/paths';
  import SectionError from '$lib/components/SectionError.svelte';
  import { page } from '$app/stores';

  let recipeLang = $derived($page.params.recipeLang!);
  let isEnglish = $derived(recipeLang === 'recipes');
</script>

<SectionError
  sectionHref={resolve('/[recipeLang=recipeLang]', { recipeLang })}
  sectionLabel={{ en: 'Recipes', de: 'Rezepte' }}
  {isEnglish}
/>
