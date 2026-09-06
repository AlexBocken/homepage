<script lang="ts">
	import { resolve } from '$app/paths';
	import SectionError from '$lib/components/SectionError.svelte';
	import { page } from '$app/state';

	let hikesLang = $derived(page.params.hikesLang ?? 'wanderungen');
	let isEnglish = $derived(hikesLang === 'hikes');
</script>

<SectionError
	sectionHref={resolve('/[hikesLang=hikesLang]', { hikesLang })}
	sectionLabel={{ en: 'Hikes', de: 'Wanderungen' }}
	{isEnglish}
/>
