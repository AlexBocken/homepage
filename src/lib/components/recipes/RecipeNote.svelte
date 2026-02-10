<script lang="ts">
	let { note, ...restProps } = $props<{ note: string, [key: string]: any }>();
</script>
<style>
div{
	background-color: var(--red);
	color: white;
	padding: 1em;
	font-size: 1.1rem;
	max-width: 400px;
	margin-inline: auto;
	box-shadow: 0.2em 0.2em 0.5em 0.1em rgba(0, 0, 0, 0.3);
	margin-bottom: 1em;
}
h3{
	margin-block: 0;
}
</style>

<div {...restProps} >
	<h3>Notiz:</h3>
	{@html note}
</div>
