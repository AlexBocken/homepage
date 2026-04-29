<script lang="ts">
  import { resolve } from '$app/paths';
  import SectionError from '$lib/components/SectionError.svelte';
</script>

<SectionError
  sectionHref={resolve('/tasks')}
  sectionLabel={{ en: 'Tasks', de: 'Aufgaben' }}
  isEnglish={false}
/>
