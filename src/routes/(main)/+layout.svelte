<script>
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
let { data, children } = $props();

let user = $derived(data.session?.user);
</script>

<Header>
	{#snippet language_selector_mobile()}
		<LanguageSelector />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector />
	{/snippet}

	{#snippet right_side()}
		<UserHeader {user}></UserHeader>
	{/snippet}

	{@render children()}
</Header>
