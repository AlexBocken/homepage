<script>
	// The shared chrome of every catechesis page: hero, section rhythm, quote
	// flavours and the `--vc` colour scheme. See $lib/css/katechese.css.
	import '$lib/css/katechese.css';

	let { children } = $props();
</script>

{@render children()}
