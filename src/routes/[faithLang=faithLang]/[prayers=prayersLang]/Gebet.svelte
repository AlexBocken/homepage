<script>
	export let is_bilingue;
	export let name;
	export let id = '';
	export let href = '';
</script>
<style>
div.gebet{
	text-align: center;
	font-size: 1.25em;
}
:global(.gebet v){
	margin:0;
	display: block;
}
:global(.gebet v:lang(la)) {
	color: var(--nord6);
}
:global(.bilingue v:lang(de)){
	color: grey;
}
.gebet_wrapper h2{
	text-align: center;
	padding-bottom: 0.5em;
}

:global(.gebet i){
	font-style: normal;
	color: var(--nord11);
	font-weight: 900;
}
.gebet_wrapper{
	padding: 1em;
	background-color: var(--accent-dark);
	box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	max-width: 600px;
}
.gebet_wrapper.clickable {
	cursor: pointer;
	transition: transform 150ms ease, box-shadow 150ms ease;
}
.gebet_wrapper.clickable:hover {
	transform: translateY(-2px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}
.gebet_wrapper.clickable:active {
	transform: translateY(0);
}
a.gebet-link {
	text-decoration: none;
	color: inherit;
	display: block;
}
@media(prefers-color-scheme: light){
	.gebet_wrapper{
		background-color: var(--accent-light);
	}
	:global(.gebet v:lang(la)){
		color: black;
	}
}
</style>

{#if href}
<a {href} class="gebet-link">
	<div class="gebet_wrapper clickable" data-prayer-id={id}>
		<h2>{name}</h2>
		<slot name="intro"></slot>
		<div class="gebet" class:bilingue={is_bilingue}>
			<slot></slot>
		</div>
	</div>
</a>
{:else}
<div class="gebet_wrapper" data-prayer-id={id}>
	<h2>{name}</h2>
	<slot name="intro"></slot>
	<div class="gebet" class:bilingue={is_bilingue}>
		<slot></slot>
	</div>
</div>
{/if}
