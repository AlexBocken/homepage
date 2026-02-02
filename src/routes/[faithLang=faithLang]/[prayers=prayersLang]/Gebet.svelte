<script>
	export let is_bilingue;
	export let name;
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
@media(prefers-color-scheme: light){
	.gebet_wrapper{
		background-color: var(--accent-light);
	}
	:global(.gebet v:lang(la)){
		color: black;
	}
}
</style>

<div class="gebet_wrapper">
	<h2>{name}</h2>
	<slot name="intro"></slot>
	<div class="gebet" class:bilingue={is_bilingue}>
		<slot></slot>
	</div>
</div>
