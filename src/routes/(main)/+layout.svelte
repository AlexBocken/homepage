<script>
import Header from '$lib/components/Header.svelte'
import UserHeader from '$lib/components/UserHeader.svelte';
import LanguageSelector from '$lib/components/LanguageSelector.svelte';
let { data } = $props();

let user = $derived(data.session?.user);
</script>

<Header>
	<ul class=site_header slot=links>
	</ul>
	<LanguageSelector slot=language_selector_mobile />
	<LanguageSelector slot=language_selector_desktop />
	<UserHeader {user} slot=right_side></UserHeader>
	<slot></slot>
</Header>
