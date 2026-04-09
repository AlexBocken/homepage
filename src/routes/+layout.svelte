<script>
	import '../app.css';
	import { onNavigate } from '$app/navigation';
	import Toast from '$lib/components/Toast.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	let { children } = $props();

	onNavigate((navigation) => {
		if (!(/** @type {any} */ (document)).startViewTransition) return;

		// Skip if staying within the same route group (recipe layout handles its own)
		const fromGroup = navigation.from?.route.id?.split('/')[1] ?? '';
		const toGroup = navigation.to?.route.id?.split('/')[1] ?? '';
		if (fromGroup === toGroup) return;

		return new Promise((resolve) => {
			(/** @type {any} */ (document)).startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

{@render children()}
<Toast />
<ConfirmDialog />