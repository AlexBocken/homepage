<script>

	let {
		value = $bindable(''),
		placeholder = 'Search...',
		clearTitle = 'Clear search',
		onClear = () => {}
	} = $props();

	function handleClear() {
		value = '';
		onClear();
	}
</script>
<style>
input {
	all: unset;
	box-sizing: border-box;
	background: var(--nord0);
	color: #fff;
	padding: 0.7rem 2rem;
	border-radius: var(--radius-pill);
	width: 100%;
}
input::placeholder {
	color: var(--nord6);
}

.search {
	width: 500px;
	max-width: 85vw;
	position: relative;
	margin: 2.5rem auto 1.2rem;
	font-size: 1.6rem;
	display: flex;
	align-items: center;
	transition: var(--transition-fast);
	filter: drop-shadow(0.4em 0.5em 0.4em rgba(0,0,0,0.4));
}

.search:hover,
.search:focus-within {
	scale: 1.02 1.02;
	filter: drop-shadow(0.4em 0.5em 1em rgba(0,0,0,0.6));
}

.search-button {
	all: unset;
	display: flex;
	justify-content: center;
	align-items: center;
	position: absolute;
	right: 0.5em;
	width: 1.5em;
	height: 1.5em;
	color: var(--nord6);
	cursor: pointer;
	transition: color 180ms ease-in-out;
}
.search-button:hover {
	color: white;
	scale: 1.1 1.1;
}
.search-button:active {
	transition: 50ms;
	scale: 0.8 0.8;
}
.search-button svg {
	width: 100%;
	height: 100%;
}
</style>

<div class="search">
	<input type="text" {placeholder} bind:value>
	{#if value}
		<button type="button" class="search-button" onclick={handleClear}>
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
				<title>{clearTitle}</title>
				<path d="M135.19 390.14a28.79 28.79 0 0021.68 9.86h246.26A29 29 0 00432 371.13V140.87A29 29 0 00403.13 112H156.87a28.84 28.84 0 00-21.67 9.84v0L46.33 256l88.86 134.11z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="32"/>
				<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="32" d="M336.67 192.33L206.66 322.34M336.67 322.34L206.66 192.33"/>
			</svg>
		</button>
	{/if}
</div>
