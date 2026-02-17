<style>
div{
	max-width: 900px;
	display:flex;
	flex-direction: row;
	flex-wrap: wrap;
	margin-inline:auto;
	gap: clamp(0.4rem, 1vw, 1rem);
	justify-content: space-evenly;
}
</style>

<div>
<slot></slot>
</div>
