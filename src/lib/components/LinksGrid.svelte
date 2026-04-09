<style>

.links_grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(250px, calc(50% - 1rem)), 1fr));
	gap: 2rem;
	max-width: 1000px;
	margin-inline: auto;
	padding: 2rem 1rem;
}

/* Base fill for all icons */
:global(.links_grid a svg:not(.lock-icon)) {
	fill: var(--grid-fill-base);
}
/* Mottled pops — prime-offset selectors for irregular feel */
:global(.links_grid a:nth-child(3n+1) svg:not(.lock-icon)) {
	fill: var(--grid-fill-pop-a);
}
:global(.links_grid a:nth-child(5n+3) svg:not(.lock-icon)) {
	fill: var(--grid-fill-pop-b);
}
:global(.links_grid a:nth-child(7n) svg:not(.lock-icon)) {
	fill: var(--grid-fill-pop-c);
}

:global(.links_grid a){
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-decoration: unset;
	color: var(--color-text-primary);
	background-color: var(--color-surface);
	border-radius: var(--radius-card);
	overflow: hidden;
	transition: var(--transition-normal);
	width: 100%;
	padding: 1rem;
	position: relative;
	box-shadow: var(--shadow-sm);
}
:global(.links_grid a:hover){
	box-shadow: var(--shadow-hover);
	scale: 1.02;
}
:global(.links_grid a :is(svg, img)){
	height: 120px;
}
:global(.links_grid h3){
	font-size: 1.5rem;
	color: var(--color-text-primary);
}
:global(.links_grid a .lock-icon){
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	width: 1.5rem;
	height: 1.5rem;
	fill: var(--color-text-secondary);
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

</style>

<div class=links_grid>
	<slot></slot>
</div>
