<style>

.links_grid {
	/* Light mode card palette */
	--card-bg-a: var(--nord6);
	--card-bg-b: var(--nord5);
	--card-bg-c: var(--nord6);
	--card-bg-d: var(--nord5);
	--card-fill-a: var(--nord11);
	--card-fill-b: var(--nord10);
	--card-fill-c: var(--nord0);
	--card-fill-d: var(--nord0);
	--card-text: var(--nord0);
	--card-shadow: rgba(0,0,0,0.04);
	--card-shadow-hover: rgba(0,0,0,0.1);
	--card-lock: var(--nord3);

	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(min(250px, calc(50% - 1rem)), 1fr));
	gap: 2rem;
	max-width: 1000px;
	margin-inline: auto;
	padding: 2rem 1rem;
}

@media (prefers-color-scheme: dark) {
	.links_grid {
		--card-bg-a: #1a1a1a;
		--card-bg-b: #1a1a1a;
		--card-bg-c: var(--nord1);
		--card-bg-d: #000;
		--card-fill-a: var(--nord11);
		--card-fill-b: var(--nord9);
		--card-fill-c: var(--nord8);
		--card-fill-d: var(--nord7);
		--card-text: white;
		--card-shadow: rgba(0,0,0,0.08);
		--card-shadow-hover: rgba(0,0,0,0.15);
		--card-lock: var(--nord3);
	}
}
:global(:root[data-theme="dark"]) .links_grid {
	--card-bg-a: #1a1a1a;
	--card-bg-b: #1a1a1a;
	--card-bg-c: var(--nord1);
	--card-bg-d: #000;
	--card-fill-a: var(--nord11);
	--card-fill-b: var(--nord9);
	--card-fill-c: var(--nord8);
	--card-fill-d: var(--nord7);
	--card-text: white;
	--card-shadow: rgba(0,0,0,0.08);
	--card-shadow-hover: rgba(0,0,0,0.15);
	--card-lock: var(--nord3);
}
:global(:root[data-theme="light"]) .links_grid {
	--card-bg-a: var(--nord6);
	--card-bg-b: var(--nord5);
	--card-bg-c: var(--nord6);
	--card-bg-d: var(--nord5);
	--card-fill-a: var(--nord11);
	--card-fill-b: var(--nord10);
	--card-fill-c: var(--nord0);
	--card-fill-d: var(--nord0);
	--card-text: var(--nord0);
	--card-shadow: rgba(0,0,0,0.04);
	--card-shadow-hover: rgba(0,0,0,0.1);
	--card-lock: var(--nord3);
}

:global(.links_grid a:nth-child(4n)),
:global(.links_grid a:nth-child(4n) svg:not(.lock-icon)){
	background-color: var(--card-bg-a);
	fill: var(--card-fill-a);
}
:global(.links_grid a:nth-child(4n+1)),
:global(.links_grid a:nth-child(4n+1) svg:not(.lock-icon)){
	background-color: var(--card-bg-b);
	fill: var(--card-fill-b);
}
:global(.links_grid a:nth-child(4n+2)),
:global(.links_grid a:nth-child(4n+2) svg:not(.lock-icon)){
	background-color: var(--card-bg-c);
	fill: var(--card-fill-c);
}
:global(.links_grid a:nth-child(4n+3)),
:global(.links_grid a:nth-child(4n+3) svg:not(.lock-icon)){
	background-color: var(--card-bg-d);
	fill: var(--card-fill-d);
}

:global(.links_grid a){
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-decoration: unset;
	color: var(--card-text);
	transition: var(--transition-normal);
	width: 100%;
	padding: 1rem;
	position: relative;
	box-shadow: 0 0.1em 0.5em 0 var(--card-shadow);
}
:global(.links_grid a:hover){
	box-shadow: 0 0.2em 1em 0 var(--card-shadow-hover);
	scale: 1.02;
}
:global(.links_grid a :is(svg, img)){
	height: 120px;
}
:global(.links_grid h3){
	font-size: 1.5rem;
	color: var(--card-text);
}
:global(.links_grid a .lock-icon){
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	width: 1.5rem;
	height: 1.5rem;
	fill: var(--card-lock);
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
