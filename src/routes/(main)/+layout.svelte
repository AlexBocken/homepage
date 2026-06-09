<script>
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
import OfflineSyncIndicator from '$lib/components/OfflineSyncIndicator.svelte';
import { languageStore } from '$lib/stores/language.svelte';
let { data, children } = $props();

let user = $derived(data.session?.user);
</script>

<Header fullSymbol={true}>
	{#snippet language_selector_mobile()}
		<LanguageSelector />
	{/snippet}

	{#snippet language_selector_desktop()}
		<LanguageSelector />
	{/snippet}

	{#snippet logo_overlay()}
		<div class="logo-pip">
			<OfflineSyncIndicator lang={languageStore.value} />
		</div>
	{/snippet}

	{#snippet right_side()}
		<UserHeader {user} lang={languageStore.value}></UserHeader>
	{/snippet}

	{@render children()}
</Header>

<style>
	:global(.logo-pip) {
		position: absolute;
		top: -8px;
		right: -7px;
		z-index: 2;
		pointer-events: auto;
	}
</style>
