<style>

:global(.links_grid a:nth-child(4n)),
:global(.links_grid a:nth-child(4n) svg:not(.lock-icon)){
	background-color: var(--nord4);
	fill: var(--nord11);
}
:global(.links_grid a:nth-child(4n+1)),
:global(.links_grid a:nth-child(4n+1) svg:not(.lock-icon)){
	background-color: var(--nord6);
	fill: var(--nord10);
}
:global(.links_grid a:nth-child(4n+2)){
	background-color: var(--nord5);
}
:global(.links_grid a:nth-child(4n+3)){
	background-color: var(--nord5);
}

:global(a){
	text-decoration: unset;
	color: var(--nord0);
	transition: var(--transition-normal);
}
:global(.links_grid a:hover){
	box-shadow: 1em 1em 2em 1em rgba(0,0,0, 0.3);
}
:global(.links_grid a){
	box-shadow: 0.2em 0.2em 1em 1em rgba(0,0,0, 0.1);
}
.links_grid{
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(250px, calc(50% - 1rem)), 1fr));
	gap: 2rem;
	max-width: 1000px;
	margin-inline: auto;
	padding: 2rem 1rem;
}
:global(.links_grid a){
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-decoration: unset;
	color: var(--nord0);
	transition: var(--transition-normal);
	width: 100%;
	padding: 1rem;
	position: relative;
}
:global(.links_grid a:hover){
	scale: 1.02;
}
:global(.links_grid a :is(svg, img)){
	height: 120px;
	fill: var(--nord0);
}
:global(.links_grid h3){
	font-size: 1.5rem;
}
:global(.links_grid a .lock-icon){
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	width: 1.5rem;
	height: 1.5rem;
	fill: var(--nord3);
	opacity: 0.5;
}

@media (max-width: 560px) {
	.links_grid {
		gap: 1rem;
		padding: 1.5rem 0.75rem;
	}
	:global(.links_grid a :is(svg, img)) {
		height: 90px;
	}
	:global(.links_grid h3) {
		font-size: 1.2rem;
	}
	:global(.links_grid a) {
		padding: 0.75rem;
	}
	:global(.links_grid a .lock-icon) {
		width: 1.2rem;
		height: 1.2rem;
	}
}

@media (max-width: 410px) {
	.links_grid {
		gap: 0.5rem;
		padding: 1rem 0.5rem;
	}
	:global(.links_grid a :is(svg, img)) {
		height: 64px;
	}
	:global(.links_grid h3) {
		font-size: 0.95rem;
	}
	:global(.links_grid a) {
		padding: 0.5rem;
	}
	:global(.links_grid a .lock-icon) {
		width: 1rem;
		height: 1rem;
		top: 0.3rem;
		right: 0.3rem;
	}
}

@media (prefers-color-scheme: dark){
	:global(.links_grid h3){
		color: white;
	}
	:global(.links_grid a .lock-icon){
		fill: var(--nord3);
	}
	:global(.links_grid a:nth-child(4n)),
	:global(.links_grid a:nth-child(4n) svg:not(.lock-icon)){
		background-color: var(--nord6-dark);
		fill: var(--nord11);
	}
	:global(.links_grid a:nth-child(4n+1)),
	:global(.links_grid a:nth-child(4n+1) svg:not(.lock-icon)){
		background-color: var(--accent-dark);
		fill: var(--nord9);
	}
	:global(.links_grid a:nth-child(4n+2)),
	:global(.links_grid a:nth-child(4n+2) svg:not(.lock-icon)){
		background-color: var(--nord1);
		fill: var(--nord8);
	}
	:global(.links_grid a:nth-child(4n+3)),
	:global(.links_grid a:nth-child(4n+3) svg:not(.lock-icon)){
		background-color: var(--background-dark);
		fill: var(--nord7);
	}
}
</style>

<div class=links_grid>
	<slot></slot>
</div>
