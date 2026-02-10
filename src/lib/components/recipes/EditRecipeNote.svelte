<script lang="ts">
	let { note = $bindable("") } = $props<{ note?: string }>();
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
textarea {
	width: 100%;
	min-height: 80px;
	padding: 0.5em;
	border-radius: 5px;
	border: none;
	color: white;
	font-size: 1rem;
	resize: vertical;
	margin-top: 0.5em;
	font-family: sans-serif;
	background-color: transparent;
}
textarea::placeholder {
	color: rgba(255, 255, 255, 0.6);
}
</style>

<div>
	<h3>Notiz:</h3>
	<textarea bind:value={note} placeholder="Füge eine Notiz für dieses Rezept hinzu..."></textarea>
</div>
