<script>
	let { pos, BEAD_SPACING, DECADE_OFFSET, activeSection, decadeCounters } = $props();
</script>
<style>
.linear-rosary {
	width: 100%;
	height: auto;
	display: block;
	-webkit-tap-highlight-color: transparent;
}

.bead {
	fill: var(--nord10);
	transition: all 0.3s ease;
}

.large-bead {
	fill: var(--nord12);
	transition: all 0.3s ease;
}

.chain {
	stroke: var(--nord4);
	stroke-width: 2;
	fill: none;
	opacity: 0.5;
}

.cross-symbol {
	fill: var(--nord4);
	transition: all 0.3s ease;
}

@media (prefers-color-scheme: light) {
	.cross-symbol {
		fill: var(--nord3);
	}
	.chain {
		stroke: var(--nord3);
	}
}

.hitboxes {
	fill: transparent;
}

/* Active states */
.active-bead {
	fill: var(--nord11) !important;
	filter: drop-shadow(0 0 8px var(--nord11));
}

.active-large-bead {
	fill: var(--nord13) !important;
	filter: drop-shadow(0 0 10px var(--nord13));
}

.cross-symbol.active-cross {
	fill: var(--nord11) !important;
	filter: drop-shadow(0 0 10px var(--nord11));
}

/* Highlighted bead (orange for counting) */
.counted-bead {
	fill: var(--nord13) !important;
	filter: drop-shadow(0 0 8px var(--nord13));
}
</style>

<svg class="linear-rosary" viewBox="-100 -100 250 2200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMin meet">
	<defs>
		<symbol id="cross-glyph" viewBox="0 0 1304 1497">
			<path transform="translate(-132, 1497) scale(1, -1)" d="M315 948Q293 903 245 857Q292 813 315 768L410 835V881ZM1159 880V834L1253 767Q1276 813 1323 857Q1276 903 1253 948ZM875 1314Q831 1337 784 1384Q740 1337 695 1314L763 1219H808ZM807 277H762L695 182Q740 159 784 112Q830 159 875 182ZM868 941H1096L1304 1067Q1314 962 1436 856Q1314 752 1304 648L1096 774H868V340L994 132Q888 121 783 0Q679 121 575 132L701 340V774H473L265 648Q254 752 132 857Q254 962 265 1067L473 941H701V1155L575 1364Q679 1375 784 1497Q888 1375 994 1364L868 1155ZM758 1040V881H642V835H758V451H812V835H928V881H812V1040Z" />
		</symbol>
	</defs>

	<!-- Vertical chain -->
	<line x1="25" y1={pos.cross} x2="25" y2={pos.final_paternoster + 40} class="chain" />

	<!-- Cross (at top) -->
	<g id="cross-section" data-section="cross">
		<use href="#cross-glyph" x={25 - 25} y={pos.cross - 58} width="50" height="58"
			class="cross-symbol" class:active-cross={activeSection === 'cross'} />
	</g>

	<!-- First large bead (Paternoster) -->
	<circle cx="25" cy={pos.lbead1} r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead1'} data-section="lbead1" />

	<!-- Three small beads -->
	<circle cx="25" cy={pos.start1} r="10" class="bead" class:active-bead={activeSection === 'start1'} data-section="start1" />
	<circle cx="25" cy={pos.start2} r="10" class="bead" class:active-bead={activeSection === 'start2'} data-section="start2" />
	<circle cx="25" cy={pos.start3} r="10" class="bead" class:active-bead={activeSection === 'start3'} data-section="start3" />

	<!-- Large bead before decades -->
	<circle cx="25" cy={pos.lbead2} r="15" class="large-bead" class:active-large-bead={activeSection === 'lbead2'} data-section="lbead2" />

	<!-- Benedictus Medal -->
	<image href="/glaube/benedictus.svg" x="5" y={pos.lbead2 + 25} width="40" height="40" />

	<!-- 5 Decades -->
	{#each [1, 2, 3, 4, 5] as d (d)}
		{@const decadePos = pos[`secret${d}`]}
		{@const transPos = pos[`secret${d}_transition`]}
		<!-- Decade {d}: Ave Maria (10 beads) -->
		{#each Array(10) as _, i (i)}
			<circle cx="25" cy={decadePos + DECADE_OFFSET + i * BEAD_SPACING} r="10" class="bead"
				class:active-bead={activeSection === `secret${d}`}
				class:counted-bead={i < decadeCounters[`secret${d}`]}
				data-section={`secret${d}`} />
		{/each}
		<!-- Transition: Gloria + Fatima + Paternoster (large bead) -->
		{#if d < 5}
			<circle cx="25" cy={transPos} r="15" class="large-bead" class:active-large-bead={activeSection === `secret${d}_transition`} data-section={`secret${d}_transition`} />
		{/if}
	{/each}

	<image href="/glaube/benedictus.svg" x="5" y={pos.secret5 + DECADE_OFFSET + 9 * BEAD_SPACING + 15} width="40" height="40" />
	<!-- Final transition: Gloria + Fatima -->
	<circle cx="25" cy={pos.final_transition} r="15" class="large-bead" class:active-large-bead={activeSection === 'final_transition'} data-section="final_transition" />

	<circle cx="25" cy={pos.final_salve} r="10" class="bead" class:active-bead={activeSection === 'final_salve'} data-section="final_salve" />
	<circle cx="25" cy={pos.final_schlussgebet} r="10" class="bead" class:active-bead={activeSection === 'final_schlussgebet'} data-section="final_schlussgebet" />
	<circle cx="25" cy={pos.final_michael} r="10" class="bead" class:active-bead={activeSection === 'final_michael'} data-section="final_michael" />

	<circle cx="25" cy={pos.final_paternoster} r="15" class="large-bead" class:active-large-bead={activeSection === 'final_paternoster'} data-section="final_paternoster" />
	<g data-section="final_cross">
		<use href="#cross-glyph" x={25 - 25} y={pos.final_cross - 58} width="50" height="58"
			class="cross-symbol" class:active-cross={activeSection === 'final_cross'} />
	</g>

	<!-- Invisible hitboxes for larger tap targets -->
	<g class="hitboxes">
		<!-- Cross hitbox -->
		<rect x="-15" y="-30" width="80" height="80" data-section="cross" />

		<!-- Individual bead hitboxes -->
		<circle cx="25" cy={pos.lbead1} r="25" data-section="lbead1" />
		<circle cx="25" cy={pos.start1} r="20" data-section="start1" />
		<circle cx="25" cy={pos.start2} r="20" data-section="start2" />
		<circle cx="25" cy={pos.start3} r="20" data-section="start3" />
		<circle cx="25" cy={pos.lbead2} r="25" data-section="lbead2" />

		<!-- Decade hitboxes -->
		{#each [1, 2, 3, 4, 5] as d (d)}
			{@const decadePos = pos[`secret${d}`]}
			<rect x="-15" y={decadePos - 2} width="80" height={DECADE_OFFSET + 9 * BEAD_SPACING + 12} data-section={`secret${d}`} />
		{/each}

		<!-- Transition bead hitboxes -->
		{#each [1, 2, 3, 4] as d (d)}
			<circle cx="25" cy={pos[`secret${d}_transition`]} r="25" data-section={`secret${d}_transition`} />
		{/each}
		<circle cx="25" cy={pos.final_transition} r="25" data-section="final_transition" />
		<circle cx="25" cy={pos.final_salve} r="20" data-section="final_salve" />
		<circle cx="25" cy={pos.final_schlussgebet} r="20" data-section="final_schlussgebet" />
		<circle cx="25" cy={pos.final_michael} r="20" data-section="final_michael" />
		<circle cx="25" cy={pos.final_paternoster} r="25" data-section="final_paternoster" />
		<rect x="-15" y={pos.final_cross - 50} width="80" height="80" data-section="final_cross" />
	</g>

</svg>
