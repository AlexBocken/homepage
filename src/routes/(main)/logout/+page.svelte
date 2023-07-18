<script>
	import { redirect } from "@sveltejs/kit";
	import { afterNavigate } from '$app/navigation';
	import { onMount } from "svelte";
	afterNavigate(() => {
		redirect(303, "/")
	})
	onMount(() => {
		redirect(303, "/")
	})
</script>
<h1>Log Out</h1>
