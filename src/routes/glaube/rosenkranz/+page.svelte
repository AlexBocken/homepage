<script>
import "$lib/css/nordtheme.css";
import "$lib/css/christ.css";
import "$lib/css/rosenkranz.css";

const freudenreich = [`<g class=msg>
                        <text x=81 y=15 class=title>1. Gesätz</text>
                        <text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
                        <text x=74 y=25>der Herr ist mit dir.</text>
                        <text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
                        <text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
                        <text x=71 y=37 class=diff>Jesus, den du, o Jungfrau, </text>
                        <text x=58 y=41 class=diff>vom Heiligen Geist empfangen hast.</text>
                        <text x=67 y=45>Heilige Maria, Mutter Gottes,</text>
                        <text x=72 y=49>bitte für uns Sünder jetzt </text>
                        <text x=58 y=53>und in der Stunde unseres Todes. Amen.</text>
                </g>`,
                `<g class=msg>
                        <text x=81 y=15 class=title>2. Gesätz</text>
                        <text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
                        <text x=74 y=25>der Herr ist mit dir.</text>
                        <text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
                        <text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
                        <text x=58 y=37 class=diff>Jesus, den du, o Jungfrau, zu Elisabet.</text>
                        <text x=82 y=41 class=diff>getragen hast.</text>
                        <text x=67 y=45>Heilige Maria, Mutter Gottes,</text>
                        <text x=72 y=49>bitte für uns Sünder jetzt </text>
                        <text x=58 y=53>und in der Stunde unseres Todes. Amen.</text>
                </g>`,
                `<g class=msg>
                        <text x=81 y=15 class=title>3. Gesätz</text>
                        <text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
                        <text x=74 y=25>der Herr ist mit dir.</text>
                        <text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
                        <text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
                        <text x=73 y=37 class=diff>Jesus, den du, o Jungfrau,</text>
                        <text x=72 y=41 class=diff>in Betlehem geboren hast.</text>
                        <text x=68 y=45>Heilige Maria, Mutter Gottes,</text>
                        <text x=72 y=49>bitte für uns Sünder jetzt </text>
                        <text x=57 y=53>und in der Stunde unseres Todes. Amen.</text>
                </g>`,
                `<g class=msg>
                        <text x=81 y=15 class=title>4. Gesätz</text>
                        <text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
                        <text x=74 y=25>der Herr ist mit dir.</text>
                        <text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
                        <text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
                        <text x=70 y=37 class=diff>Jesus, den du, o Jungfrau, </text>
                        <text x=72 y=41 class=diff>im Tempel geopfert hast.</text>
                        <text x=68 y=45>Heilige Maria, Mutter Gottes,</text>
                        <text x=72 y=49>bitte für uns Sünder jetzt </text>
                        <text x=57 y=53>und in der Stunde unseres Todes. Amen.</text>
                </g>`,
                `<g class=msg>
                        <text x=81 y=15 class=title>5. Gesätz</text>
                        <text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
                        <text x=74 y=25>der Herr ist mit dir.</text>
                        <text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
                        <text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
                        <text x=73 y=37 class=diff>Jesus, den du, o Jungfrau, </text>
                        <text x=64 y=41 class=diff>im Tempel wiedergefunden hast.</text>
                        <text x=69 y=45>Heilige Maria, Mutter Gottes,</text>

                        <text x=74 y=49>bitte für uns Sünder jetzt </text>
                        <text x=57 y=53>und in der Stunde unseres Todes. Amen.</text>
                </g>`];
const schmerzhaften = [`<g class=msg>
			<text x=81 y=15 class=title>1. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=59 y=37 class=diff>Jesus, der für uns Blut geschwitzt hat.</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>2. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=58 y=37 class=diff>Jesus, der für uns gegeißelt worden ist.</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>3. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=68 y=37 class=diff>Jesus, der für uns mit Dornen </text>
			<text x=76 y=41 class=diff>gekrönt worden ist.</text>
			<text x=68 y=45>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=49>bitte für uns Sünder jetzt </text>
			<text x=57 y=53>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>4. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=66 y=37 class=diff>Jesus, der für uns das schwere</text>
			<text x=77 y=41 class=diff> Kreuz getragen hat.</text>
			<text x=68 y=45>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=49>bitte für uns Sünder jetzt </text>
			<text x=57 y=53>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>5. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=58 y=37 class=diff>Jesus, der für uns gekreuzigt worden ist.</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=57 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>`];
const glorreichen = [`<g class=msg>
			<text x=81 y=15 class=title>1. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=58 y=37 class=diff>Jesus, der von den Toten auferstanden ist.</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>2. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=58 y=37 class=diff>Jesus, der in den Himmel aufgefahren ist.</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>3. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=53 y=37 class=diff>Jesus, der uns den Heiligen Geist gesandt hat.</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>4. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=71 y=37 class=diff>Jesus, der dich, o Jungfrau,</text>
			<text x=63 y=41 class=diff>in den Himmel aufgenommen hat</text>
			<text x=67 y=45>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=49>bitte für uns Sünder jetzt </text>
			<text x=57 y=53>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>5. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=71 y=37 class=diff>Jesus, der dich, o Jungfrau,</text>
			<text x=74 y=41 class=diff>im Himmel gekrönt hat.</text>
			<text x=67 y=45>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=49>bitte für uns Sünder jetzt </text>
			<text x=57 y=53>und in der Stunde unseres Todes. Amen.</text>
		</g>`];
const lichtreichen = [`<g class=msg>
			<text x=81 y=15 class=title>1. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=56 y=37 class=diff>Jesus, der von Johannes getauft worden ist.</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>2. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=58 y=37 class=diff>Jesus, der sich bei der Hochzeit in Kana</text>
			<text x=78 y=41 class=diff>geoffenbart hat.</text>
			<text x=67 y=45>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=49>bitte für uns Sünder jetzt </text>
			<text x=58 y=53>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		 `<g class=msg>
			<text x=81 y=15 class=title>3. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=53 y=37 class=diff>Jesus, der uns das Reich Gottes verkündet hat.</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=17 class=title>4. Gesätz</text>
			<text x=57 y=23>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=27>der Herr ist mit dir.</text>
			<text x=60 y=31>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=35>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=54 y=39 class=diff>Jesus, der auf dem Berg verklärt worden ist.</text>
			<text x=67 y=43>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=47>bitte für uns Sünder jetzt </text>
			<text x=57 y=51>und in der Stunde unseres Todes. Amen.</text>
		</g>`,
		`<g class=msg>
			<text x=81 y=15 class=title>5. Gesätz</text>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=55 y=37 class=diff>Jesus, der uns die Eucharistie geschenkt hat.</text>
			<text x=69 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=74 y=45>bitte für uns Sünder jetzt </text>
			<text x=59 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>`];
let display_mysteries = schmerzhaften;
console.log("display_mysteries", display_mysteries);
let now = new Date();
console.log("now", now);
</script>
<style>
.container{
	max-width: 1000px;
	margin: auto;
}

h1{
	text-align: center;
	font-size: 3em;
}
</style>
<svelte:head>
        <title>Rosenkranz</title>
	<meta name="description" content="Eine digitale Version des Rosenkranzes mit den Geheimnissen des Tages.">
</svelte:head>

<div class="container">
<h1>Rosenkranz (WIP)</h1>
<p>
	Diese Website ist ein einfacher Port meiner alten Homepage, vieles ist noch nicht so wie es eigentlich sein sollte.
</p>
<p>
Der Rosenkranz ist eine katholische Gebetskette welche seit Jahrhunderten verwendet wird.
Das Credo, die 6 Paternoster und Gloria Patri und 53 Ave Maria bieten die Möglichkeit strukturiert in einen reflektierenden Zustand zum Glauben und sich selber zu kommen.
Die <q>Geheimnisse</q> der Ave Maria reflektieren das Leben Christi und seine verschiedenen Aspekte je nach Anlass.
Somit dienen die jeweiligen Dekaden dem Zweck sich auf diese Geheimnisse zu konzentrieren und zu reflektieren.
</p>
<p>
Während des Rosenkranz betet man die fundamentalsten Gebete des katholischen Glaubens. Für diejenigen, die sich noch nicht sicher fühlen kann man diese <a href=gebete>hier</a> nachschauen.
</p>

<h2>Interaktiver Rosenkranz des Tages</h2>
<p>Durch ein hovern mit der Maus (oder tippen on mobile) über Die einzelnen Teile werden die Gebete für die einzelnen Bereiche angezeigt.
Der unten abgebildete Rosenkranz zeigt die aktuellen Gehmeinisse des Tages nach Wochenplan oder saisonellen Ordnungen (mehr dazu weiter unten). Heute ist das der Rosenkranz mit den lichtreichen Geheimnissen.
</p>

<svg
	width=100%
	viewBox="0 0 131.85777 69.805824">
	<g transform="translate(-0.06714916,1.4245484)">
	<g class=chain>
		<path d="m 48.397565,28.198467 c -0.87983,-0.22311 -18.891448,-8.42154 -28.256758,-7.92381 -10.11425,0.53754 -14.0719002,4.23504 -14.1848502,11.47326"/>
		<path
		d="m 47.822665,34.140137 c 0,0.39379 0.008,0.78771 0.0225,1.18145 0.015,0.39375 0.0374,0.78732 0.0672,1.18041 0.0298,0.39308 0.0671,0.78568 0.11166,1.17748 0.0446,0.39181 0.0965,0.78281 0.15578,1.17271 0.0592,0.3899 0.1258,0.77869 0.1996,1.16606 0.0738,0.38738 0.15485,0.77333 0.2431,1.15756 0.0882,0.38422 0.18369,0.76671 0.28629,1.14715 0.10259,0.38045 0.21233,0.75886 0.32917,1.13491 0.11683,0.37606 0.24077,0.74976 0.37174,1.12079 0.13097,0.37104 0.26899,0.73941 0.414,1.10481 0.14501,0.3654 0.29701,0.72782 0.45595,1.08695 0.15894,0.35914 0.32482,0.71499 0.49758,1.06723 0.17277,0.35225 0.35242,0.7009 0.53891,1.04564 0.18649,0.34475 0.37982,0.68558 0.57993,1.02219 0.20011,0.33661 0.407,0.669 0.62063,0.99685 0.21363,0.32786 0.43399,0.65119 0.66103,0.96967 0.22703,0.31849 0.46075,0.63213 0.7011,0.94061 0.24035,0.30849 0.48733,0.61182 0.74088,0.90968 0.25355,0.29787 0.51368,0.59027 0.78034,0.87689 0.26666,0.28662 0.53984,0.56747 0.81949,0.84223 0.27965,0.27475 0.56578,0.54342 0.85833,0.80569 0.22409,0.2009 0.45196,0.39805 0.68356,0.5913 0.0708,0.059 0.14171,0.11772 0.21289,0.17606 0.30417,0.24934 0.6122,0.49241 0.92393,0.72936 0.31174,0.23694 0.62717,0.46775 0.94615,0.69257 0.31898,0.22481 0.6415,0.44364 0.9674,0.6566 0.32591,0.21297 0.6552,0.42008 0.98771,0.62147 0.33251,0.20139 0.66825,0.39707 1.00705,0.58716 0.3388,0.19009 0.68066,0.37459 1.02544,0.55366 0.34477,0.17906 0.69244,0.35268 1.04287,0.52099 0.35042,0.16831 0.70359,0.33132 1.05935,0.48915 0.35576,0.15783 0.7141,0.3105 1.07487,0.45813 0.36078,0.14763 0.723984,0.29022 1.089454,0.42793 0.36546,0.1377 0.7332,0.2705 1.10305,0.39855 0.36985,0.12805 0.7418,0.25134 1.11571,0.37 0.37391,0.11867 0.74977,0.23272 1.12742,0.34228 0.37764,0.10956 0.75708,0.21464 1.13816,0.31538 0.38107,0.10073 0.76377,0.19711 1.14795,0.28929 0.38417,0.0922 0.76982,0.18014 1.15678,0.26403 0.38697,0.0839 0.77524,0.16372 1.16467,0.23961 0.38943,0.0759 0.78001,0.14784 1.17159,0.21599 0.39158,0.0682 0.78415,0.13251 1.17756,0.19321 0.39341,0.0607 0.78766,0.11773 1.18258,0.17124 0.39492,0.0535 0.79052,0.10351 1.18663,0.15011 0.39611,0.0466 0.79275,0.0898 1.18974,0.12979 0.39699,0.04 0.79433,0.0767 1.19188,0.1103 0.39755,0.0336 0.79529,0.0641 1.19308,0.0916 0.39778,0.0275 0.79561,0.0521 1.19331,0.0738 0.39771,0.0217 0.79529,0.0406 1.1926,0.0568 0.3973,0.0162 0.79433,0.0297 1.19092,0.0406 0.39659,0.0109 0.79274,0.0193 1.18829,0.0252 0.39555,0.006 0.79051,0.009 1.18471,0.0106 0.10538,3.2e-4 0.21072,4.8e-4 0.31599,4.8e-4 0.28851,0 0.57714,-10e-4 0.86585,-0.004 0.39407,-0.003 0.78828,-0.009 1.18256,-0.0173 0.39427,-0.008 0.7886,-0.019 1.18289,-0.0326 0.39428,-0.0135 0.78853,-0.0297 1.18263,-0.0489 0.3941,-0.0191 0.78806,-0.0412 1.18177,-0.0663 0.39372,-0.0251 0.78719,-0.0533 1.18031,-0.0848 0.39314,-0.0315 0.78593,-0.0662 1.17828,-0.1044 0.39235,-0.0382 0.78426,-0.0798 1.17563,-0.12509 0.391371,-0.0453 0.782201,-0.0942 1.172391,-0.14687 0.39019,-0.0527 0.77975,-0.10923 1.16855,-0.16974 0.38882,-0.0605 0.7769,-0.12503 1.16414,-0.19372 0.38724,-0.0687 0.77365,-0.14154 1.15911,-0.21877 0.38546,-0.0772 0.77,-0.15879 1.15349,-0.24491 0.38349,-0.0861 0.76595,-0.17678 1.14728,-0.27216 0.38132,-0.0954 0.76151,-0.19548 1.14047,-0.30049 0.37896,-0.10501 0.75668,-0.21492 1.13306,-0.32992 0.17428,-0.0532 0.34827,-0.10758 0.52197,-0.16302 0.20144,-0.0643 0.40247,-0.13025 0.60303,-0.19787 0.3735,-0.12592 0.74537,-0.25762 1.11517,-0.39525 0.3698,-0.13762 0.73756,-0.28117 1.10284,-0.43077 0.36528,-0.1496 0.72808,-0.30526 1.08799,-0.4671 0.35991,-0.16185 0.71693,-0.32988 1.07062,-0.50424 0.3537,-0.17436 0.70408,-0.35505 1.05074,-0.54219 0.34675,-0.18703 0.68965,-0.38062 1.02845,-0.58083 0.3387,-0.2002 0.6734,-0.40699 1.0034,-0.6205 0.33,-0.2135 0.6555,-0.4338 0.976,-0.6609 0.3204,-0.22709 0.6359,-0.4611 0.946,-0.7021 0.31,-0.2409 0.6147,-0.4889 0.9135,-0.744 0.2988,-0.2551 0.5918,-0.51739 0.8785,-0.7869 0.0868,-0.0815 0.17294,-0.16375 0.25854,-0.24663 0.19731,-0.19104 0.39112,-0.3855 0.58143,-0.58324 0.27286,-0.28353 0.5385,-0.5738 0.79682,-0.87038 0.25832,-0.29658 0.50932,-0.59947 0.75293,-0.90823 0.24361,-0.30877 0.47981,-0.62341 0.70854,-0.94348 0.22872,-0.32008 0.44995,-0.6456 0.66362,-0.97613 0.21367,-0.33053 0.41976,-0.66606 0.6182,-1.00617 0.19844,-0.34011 0.38923,-0.68479 0.57227,-1.03361 0.18304,-0.34882 0.35835,-0.70178 0.52582,-1.05845 0.16748,-0.35667 0.32713,-0.71704 0.47886,-1.08068 0.15174,-0.36365 0.29557,-0.73056 0.4314,-1.10032 0.0784,-0.21333 0.15406,-0.4276 0.22709,-0.64273 0.0536,-0.15775 0.10576,-0.3159 0.15665,-0.47443 0.12031,-0.37472 0.23327,-0.75155 0.33918,-1.13026 0.1059,-0.37872 0.20476,-0.75932 0.29686,-1.14157 0.0921,-0.38226 0.17743,-0.76616 0.25631,-1.15148 0.0789,-0.38533 0.15129,-0.77208 0.21753,-1.16002 0.0662,-0.38794 0.12631,-0.77708 0.1805,-1.16716 0.0542,-0.3901 0.10251,-0.78115 0.14525,-1.17293 0.0427,-0.39179 0.0799,-0.7843 0.11174,-1.17731 0.0319,-0.39302 0.0584,-0.78653 0.08,-1.1803 0.0216,-0.39378 0.0382,-0.78783 0.05,-1.18191 0.0119,-0.39409 0.0191,-0.78821 0.0218,-1.18214 8.8e-4,-0.12514 0.001,-0.25025 0.001,-0.37533 0,-0.2687 -8.5e-4,-0.53751 -0.003,-0.80638 -0.003,-0.39404 -0.007,-0.78823 -0.0149,-1.18243 -0.007,-0.3942 -0.0172,-0.78842 -0.0301,-1.18252 -0.0129,-0.3941 -0.0287,-0.78809 -0.0479,-1.18183 -0.0192,-0.39374 -0.0418,-0.78724 -0.0682,-1.18037 -0.0264,-0.39313 -0.0566,-0.78588 -0.091,-1.17814 -0.0344,-0.39225 -0.0731,-0.78401 -0.11643,-1.17513 -0.0433,-0.39112 -0.0913,-0.78161 -0.14434,-1.17134 -0.0531,-0.38973 -0.11118,-0.7787 -0.1748,-1.16678 -0.0636,-0.38808 -0.13275,-0.77527 -0.20779,-1.16145 -0.072,-0.37048 -0.14943,-0.74001 -0.23269,-1.1085 -0.004,-0.0156 -0.007,-0.0312 -0.0106,-0.0468 -0.0874,-0.38401 -0.18193,-0.76693 -0.28397,-1.14808 -0.10205,-0.38116 -0.21157,-0.76056 -0.32887,-1.13755 -0.1173,-0.37699 -0.24237,-0.75156 -0.37551,-1.12306 -0.13313,-0.3715 -0.27434,-0.73993 -0.4239,-1.10463 -0.14957,-0.3647 -0.30749,-0.72567 -0.47407,-1.08226 -0.16658,-0.35659 -0.34181,-0.70879 -0.52598,-1.05594 -0.18417,-0.34715 -0.37729,-0.68927 -0.57965,-1.02567 -0.20236,-0.33641 -0.41395,-0.66712 -0.63508,-0.99146 -0.22112,-0.32435 -0.45178,-0.64234 -0.69226,-0.95331 -0.13968,-0.18062 -0.28267,-0.35887 -0.42903,-0.53463 -0.10563,-0.12684 -0.21287,-0.25216 -0.32167,-0.37596 -0.25957,-0.29535 -0.52803,-0.58207 -0.80472,-0.86029 -0.27669,-0.2782101 -0.56161,-0.5479101 -0.85408,-0.8092101 -0.29247,-0.2613 -0.5925,-0.51421 -0.89942,-0.75883 -0.30692,-0.24462 -0.62072,-0.48096 -0.94075,-0.70912 -0.32002,-0.22817 -0.64626,-0.44816 -0.97805,-0.6601 -0.33179,-0.21193 -0.66913,-0.41581 -1.01135,-0.61175 -0.34222,-0.19594 -0.68932,-0.38393 -1.04062,-0.56409 -0.35131,-0.18016 -0.70683,-0.35249 -1.06588,-0.51711 -0.35906,-0.16461 -0.72165,-0.32151 -1.08712,-0.47081 -0.36547,-0.14929 -0.73379,-0.29098 -1.10433,-0.42519 -0.10938,-0.0396 -0.21895,-0.0786 -0.32869,-0.11688 -0.26204,-0.0915 -0.52495,-0.17984 -0.78868,-0.26518 -0.3742,-0.12109 -0.75005,-0.23609 -1.12744,-0.34528 -0.37739,-0.10919 -0.7563,-0.21257 -1.13661,-0.3104 -0.38031,-0.0978 -0.76201,-0.19014 -1.14498,-0.27717 -0.38295,-0.087 -0.76718,-0.16879 -1.15252,-0.24555 -0.38535,-0.0768 -0.77182,-0.14852 -1.15928,-0.21556 -0.38746,-0.067 -0.77591,-0.12934 -1.16521,-0.18719 -0.38929,-0.0579 -0.77945,-0.11124 -1.17032,-0.16044 -0.39087,-0.0492 -0.78245,-0.0942 -1.17463,-0.13533 -0.39217,-0.0411 -0.78493,-0.0783 -1.17813,-0.11183 -0.39319,-0.0335 -0.78684,-0.0634 -1.18081,-0.09 -0.39396,-0.0265 -0.78823,-0.0497 -1.18268,-0.0697 -0.394451,-0.02 -0.789081,-0.037 -1.183751,-0.0511 -0.39467,-0.0141 -0.78939,-0.0254 -1.18401,-0.0341 -0.39461,-0.009 -0.78913,-0.0149 -1.18343,-0.0187 -0.35072,-0.003 -0.70126,-0.005 -1.05153,-0.005 -0.0435,0 -0.087,3e-5 -0.13057,8e-5 -0.39389,5.1e-4 -0.78827,0.003 -1.18304,0.008 -0.39476,0.005 -0.78991,0.0127 -1.18533,0.0227 -0.39542,0.01 -0.79111,0.0225 -1.18698,0.0375 -0.39586,0.015 -0.7919,0.0326 -1.18799,0.0528 -0.39609,0.0202 -0.79225,0.0431 -1.18836,0.0686 -0.39611,0.0256 -0.79217,0.0539 -1.18808,0.085 -0.39591,0.0311 -0.79167,0.0651 -1.18717,0.10191 -0.3955,0.0368 -0.79074,0.0766 -1.18561,0.11933 -0.39487,0.0427 -0.78938,0.0885 -1.18341,0.13729 -0.39404,0.0488 -0.78759,0.10071 -1.18057,0.15578 -0.39298,0.0551 -0.78538,0.1133 -1.17709,0.17479 -0.39171,0.0615 -0.78273,0.12624 -1.17296,0.19433 -0.39023,0.0681 -0.77967,0.13953 -1.1682,0.21441 -0.38853,0.0749 -0.77616,0.15318 -1.16279,0.23501 -0.38662,0.0818 -0.77223,0.16718 -1.15673,0.25614 -0.3845,0.089 -0.76789,0.18153 -1.15005,0.2778 -0.38216,0.0963 -0.7631,0.19624 -1.14271,0.3 -0.37961,0.10375 -0.7579,0.2113 -1.13474,0.32271 -0.37685,0.11142 -0.75226,0.22671 -1.12612,0.34597 -0.37387,0.11925 -0.74619,0.24247 -1.11686,0.36974 -0.37068,0.12727 -0.7397,0.25859 -1.10697,0.39405 -0.36726,0.13546 -0.73277,0.27506 -1.09642,0.41889 -0.36364,0.14383 -0.72542,0.29189 -1.08523,0.44426 -0.35981,0.15237 -0.71765,0.30906 -1.073414,0.47015 -0.35576,0.16109 -0.70945,0.32659 -1.06094,0.49658 -0.3515,0.16999 -0.70082,0.34447 -1.04784,0.52353 -0.34702,0.17906 -0.69175,0.36271 -1.03408,0.55102 -0.34233,0.18831 -0.68227,0.38129 -1.01969,0.57903 -0.33743,0.19774 -0.67235,0.40023 -1.00466,0.6075701 -0.33231,0.20734 -0.662,0.41953 -0.98898,0.63665 -0.32697,0.21712 -0.65123,0.43917 -0.97266,0.66625 -0.0627,0.0443 -0.12538,0.0888 -0.18791,0.13355 -0.25779,0.18433 -0.51291,0.37273 -0.76523,0.56509 -0.31351,0.23901 -0.62269,0.48413 -0.92729,0.73511 -0.3046,0.25098 -0.60461,0.50783 -0.89978,0.77031 -0.29517,0.26248 -0.5855,0.5306 -0.87073,0.80411 -0.28524,0.27351 -0.56538,0.55242 -0.84018,0.83649 -0.2748,0.28407 -0.54424,0.5733 -0.80809,0.86746 -0.26384,0.29416 -0.52209,0.59325 -0.77448,0.89703 -0.25239,0.30378 -0.49892,0.61225 -0.73934,0.92518 -0.24043,0.31293 -0.47474,0.63032 -0.70269,0.95192 -0.22795,0.32161 -0.44954,0.64745 -0.66451,0.97726 -0.21497,0.32982 -0.42332,0.66363 -0.6248,1.00118 -0.20148,0.33756 -0.39609,0.67887 -0.58357,1.0237 -0.18749,0.34483 -0.36784,0.69318 -0.54082,1.0448 -0.17298,0.35163 -0.33858,0.70654 -0.49655,1.0645 -0.15797,0.35796 -0.3083,0.71897 -0.45075,1.08279 -0.14244,0.36382 -0.277,0.73045 -0.40342,1.09966 -0.12642,0.36921 -0.24469,0.741 -0.35458,1.11513 -0.10988,0.37413 -0.21136,0.75061 -0.3042,1.12918 -0.0928,0.37858 -0.17703,0.75927 -0.25231,1.14183 -0.0753,0.38256 -0.14167,0.767 -0.1989,1.15307 -0.0572,0.38608 -0.10529,0.77378 -0.14395,1.16289 -0.0387,0.38912 -0.0679,0.77963 -0.0875,1.17131 -0.0196,0.39169 -0.0295,0.78454 -0.0295,1.17832"/>
	</g>

	<g id=secret1>
		<g class=sbeads>
			<circle cx=69.696877 cy=6.3485498 />
			<circle cx=73.229958 cy=5.1320186 />
			<circle cx=76.737587 cy=4.137207 />
			<circle cx=66.363174 cy=7.8266177 />
			<circle cx=50.580643 cy=22.757719 />
			<circle cx=52.425163 cy=19.581886 />
			<circle cx=54.650059 cy=16.593082 />
			<circle cx=57.170525 cy=13.93969 />
			<circle cx=60.060627 cy=11.603291 />
			<circle cx=63.119438 cy=9.5773983 />
		</g>
		<path class=hitbox
		d="M 84.015625,0.76757812 C 80.128196,0.7917912 72.57585,2.2137295 64.888672,6.2363281 57.201493,10.258927 49.466431,17.014168 46.425781,27.634766 l 3.94336,1.128906 C 53.03143,19.464638 59.762705,13.546963 66.791016,9.8691406 73.819327,6.1913186 81.231792,4.8846971 84.042969,4.8671875 Z"/>

		{@html display_mysteries[0]}
	</g>
	<g id=secret2>
		<g class=sbeads>
			<circle cx=116.49716 cy=5.7659607 />
			<circle cx=119.72428 cy=7.5677543 />
			<circle cx=122.57488 cy=9.8888893 />
			<circle cx=91.186501 cy=2.157414 />
			<circle cx=94.871414 cy=2.0742161 />
			<circle cx=98.546501 cy=2.0834491 />
			<circle cx=102.21235 cy=2.305063 />
			<circle cx=105.89011 cy=2.715178 />
			<circle cx=113.11037 cy=4.4005208 />
			<circle cx=109.50712 cy=3.386369 />
		</g>
		<path class=hitbox
		d="m 93.193359,-0.00976563 c -2.440728,0.08655668 -4.963253,0.2880511 -7.55664,0.60742188 L 86.125,4.5683594 c 9.930784,-1.2229572 18.65495,-0.5968713 25.33398,1.484375 6.67904,2.0812463 11.22433,5.5535936 13.29493,9.9550776 l 3.61914,-1.701171 C 125.69123,8.6058654 120.04657,4.5396994 112.64844,2.234375 107.09984,0.50538173 100.51555,-0.26943565 93.193359,-0.00976563 Z"/>
		{@html display_mysteries[1]}
	</g>
	<g id=secret3>
		<g class=sbeads>
			<circle cx=129.04076 cy=22.692419 />
			<circle cx=129.59669 cy=26.329506 />
			<circle cx=129.86201 cy=29.990742 />
			<circle cx=129.9417 cy=33.718731 />
			<circle cx=129.83849 cy=37.376396 />
			<circle cx=129.45219 cy=41.049618 />
			<circle cx=128.65819 cy=44.660877 />
			<circle cx=127.52242 cy=48.180019 />
			<circle cx=125.88802 cy=51.445801 />
			<circle cx=123.80465 cy=54.525352 />
		</g>
		<path class=hitbox
		d="m 128.68555,15.082031 -3.38867,2.126953 c 0.81741,1.301256 1.73608,4.164779 2.21093,7.675782 0.47485,3.511002 0.57706,7.707577 0.125,11.919921 -0.9041,8.42469 -4.05881,16.730138 -10.19336,20.496094 l 2.0918,3.410156 c 7.78622,-4.779906 11.10103,-14.375631 12.07812,-23.480468 0.48855,-4.552419 0.3842,-9.029257 -0.13671,-12.88086 -0.52092,-3.851602 -1.38809,-7.040437 -2.78711,-9.267578 z"/>
		{@html display_mysteries[2]}
	</g>
	<g id=secret4>
		<g class="sbeads">
			<circle cx=112.07153 cy=62.876514 />
			<circle cx=108.58591 cy=64.055725 />
			<circle cx=105.00925 cy=64.940208 />
			<circle cx=101.411 cy=65.568962 />
			<circle cx=97.690193 cy=65.97805 />
			<circle cx=94.030251 cy=66.186707 />
			<circle cx=90.371307 cy=66.249756 />
			<circle cx=86.662491 cy=66.120422 />
			<circle cx=79.293854 cy=65.464813 />
			<circle cx=82.958626 cy=65.899681 />
		</g>
		<path class=hitbox
		d="m 116.03711,58.015625 c -3.32303,2.938868 -10.57008,5.18876 -18.775391,5.96875 -8.205312,0.77999 -17.37853,0.224378 -24.685547,-1.632813 l -0.986328,3.876954 c 7.887729,2.004787 17.394683,2.561123 26.050781,1.738281 8.656095,-0.822842 16.452025,-2.891421 21.046875,-6.955078 z"/>
		{@html display_mysteries[3]}
	</g>
	<g id=secret5>
		<g class=sbeads>
			<circle cx=65.335052 cy=61.534496 />
			<circle cx=62.092693 cy=59.749729 />
			<circle cx=59.033833 cy=57.687515 />
			<circle cx=56.223839 cy=55.277977 />
			<circle cx=53.828167 cy=52.490463 />
			<circle cx=51.789955 cy=49.412399 />
			<circle cx=50.191181 cy=46.08466 />
			<circle cx=48.989723 cy=42.646046 />
			<circle cx=48.216827 cy=39.006973 />
			<circle cx=47.840927 cy=35.334702 />
		</g>
		<path class=hitbox
		d="m 46.001953,30.224609 c -0.544528,7.640806 0.729621,15.093967 4.628906,21.376953 C 54.530145,57.884549 61.043386,62.888728 70.5,65.699219 l 1.140625,-3.833985 C 62.933249,59.277416 57.386945,54.902424 54.029297,49.492187 50.671649,44.081951 49.492089,37.52713 49.992187,30.509766 Z"/>
		{@html display_mysteries[4]}
	</g>
	<g id=cross>
		<g class=msg>
			<text x=74 y=17 class=title>Das Kreuzzeichen</text>
			<text x=59 y=22>Im Namen des</text>
			<text x=83.43 y=22 class="diff b">♱</text>
			<text x=87.5 y=22>Vaters und des Sohnes</text>
			<text x=66 y=26>und des Heiligen Geistes. Amen.</text>
			<text x=84 y=32 class=title>Credo</text>
			<text x=68 y=37>Ich glaub an den einen Gott.</text>
			<text x=71 y=41>Den allmächtigen Vater,</text>
			<text x=90 y=45>...</text>
		</g>
		<text class=symbol
			x="-12.473677"
			y="43.502144"
			transform="scale(-1,1)">♱
		</text>
		<rect class=hitbox
			width="9.2219276"
			height="10.897131"
			x="1.3947941"
			y="31.593271" />
	</g>
	<g id=coin transform="rotate(20 , 48.500797, 28.820524)">
		<circle cx=48.500797 cy=28.820524 />
		<text
			x="-46.710518"
			y="32.749741"
			transform="scale(-1.0825744,0.92372405)">☩
		</text>
	</g>
	<g id=start1>
		<g class=msg>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=60 y=37 class=diff>Jesus, der in uns den Glauben vermehre</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>
		<g class=sbeads>
			<circle/>
			<circle class=hitbox />
		</g>
	</g>
	<g id=start2>
		<g class=msg>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=63 y=37 class=diff>Jesus, der in uns die Hoffnung stärke</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>
		<g class=sbeads>
			<circle class=hitbox />
		</g>
	</g>
	<g id=start3>
		<g class=msg>
			<text x=57 y=21>Gegrüßet seist du Maria, voll der Gnade,</text>
			<text x=74 y=25>der Herr ist mit dir.</text>
			<text x=60 y=29>Du bist gebenedeit unter den Weibern </text>
			<text x=57 y=33>und gebenedeit ist die Frucht deines Leibes</text>
			<text x=63 y=37 class=diff>Jesus, der in uns die Liebe entzünde</text>
			<text x=67 y=41>Heilige Maria, Mutter Gottes,</text>
			<text x=72 y=45>bitte für uns Sünder jetzt </text>
			<text x=58 y=49>und in der Stunde unseres Todes. Amen.</text>
		</g>
		<g class=sbeads>
			<circle class=hitbox />
		</g>
	</g>
	<g id=lbeads>
		<g class=afterdecade>
			<g class=msg>
				<text x=77 y=15 class=title>Gloria Patri</text>
				<text x=63 y=20>Ehre sei dem Vater und dem Sohne</text>
				<text x=75 y=24>und dem Hl. Geiste.</text>
				<text x=62 y=28>Wie es war am Anfang, so auch jetzt </text>
				<text x=63 y=32>und allezeit und in Ewigkeit. Amen.</text>
				<text x=63 y=38 class=title>Das Fatima Gebet (optional)</text>
				<text x=69 y=43>O mein Jesus, verzeih' uns...</text>
				<text x=79 y=49 class=title>Paternoster</text>
				<text x=72 y=53>Vater unser im Himmel...</text>
			</g>
			<g id=lbead5>
				<circle class=lbead />
				<circle class=hitbox onclick="{true}" />
			</g>
			<g id=lbead4>
				<circle class=lbead />
				<circle class=hitbox onclick="{true}" />
			</g>
			<g id=lbead3>
				<circle class=lbead />
				<circle class=hitbox onclick="{true}" />
			</g>
			<g id=lbead6>
				<circle class=lbead />
				<circle class=hitbox onclick="{true}" />
			</g>
		</g>
		<g class=beforedecades>
			<g class=msg>
				<text x=77 y=19 class=title>Gloria Patri</text>
				<text x=63 y=24>Ehre sei dem Vater und dem Sohne</text>
				<text x=75 y=28>und dem Hl. Geiste.</text>
				<text x=62 y=32>Wie es war am Anfang, so auch jetzt </text>
				<text x=63 y=36>und allezeit und in Ewigkeit. Amen.</text>
				<text x=77 y=42 class=title>Paternoster</text>
				<text x=70 y=47>Vater unser im Himmel...</text>
			</g>
			<g id=lbead1>
				<circle class=lbead />
				<circle class=hitbox onclick="{true}" />
			</g>
			<g id=lbead2>
				<circle class=lbead />
				<circle class=hitbox onclick="{true}" />
			</g>
		</g>
	</g>
	</g>
</svg>

<h2>Die verschiedenen Geheimnisse</h2>
<p>
Die verschiedenen Geheimnisse werden zu verschiedenen Anlässen gebetet.
Dabei handelt es sich hier aber um keine strikten Regeln die eingehalten werden müssen.
Es gibt auch einen Wochenplan welcher je nach Wochentag andere Geheimnisse vorschlägt.
Dieser Plan ist wie folgt:
</p>
<div class=table >
<table>
	<tbody>
	<tr>
		<td>Mo</td>
		<td>Di</td>
		<td>Mi</td>
		<td>Do</td>
		<td>Fr</td>
		<td>Sa</td>
		<td>So</td>
	</tr>
	<tr>
		<td>freudenreich</td>
		<td>schmerzhaft</td>
		<td>glorreich</td>
		<td>lichtreich</td>
		<td>schmerzhaft</td>
		<td>freudenreich</td>
		<td>glorreich</td>
	</tr>
	</tbody>
</table>
</div>
<p>
Generell überschreiben natürlich wichtige Feiertage diesen Kalender. Zum Beispiel wird regulär während der Fastenzeit stets der Rosenkranz mit den schmerzhaften Geheimnissen gebetet.
</p>

<p>
Die Integration der lichtreichen Geheimnisse hat einige Kontroversen um sich.
Ohne diese 5 Dekaden sind die 150 Gebete der drei Sätzen an Geheimnissen eine direkte Parallele zu den 150 Psalmen der Bibel.
Die Gottgegebenheit der lichtreichen Geheimnisse ist auch umstritten.
</p>
Der Plan ohne lichtreiche Geheimnisse ist wie folgt:
<p>
<div class=table>
<table>
	<tbody>
	<tr>
		<td>Mo</td>
		<td>Di</td>
		<td>Mi</td>
		<td>Do</td>
		<td>Fr</td>
		<td>Sa</td>
		<td>So</td>
	</tr>
	<tr>
		<td>freudenreich</td>
		<td>schmerzhaft</td>
		<td>glorreich</td>
		<td>freudenreich</td>
		<td>schmerzhaft</td>
		<td>glorreich</td>
		<td>glorreich</td>
	</tr>
	</tbody>
</table>
</div>



<h3>Die freudenreichen Geheimnisse <i>(über die Geburt und Kindheit Jesu)</i></h3>
<ol><!-- gaudiosa -->
	<li>... Jesus, den du, o Jungfrau, vom Heiligen Geist empfangen hast.</li>
	<li>... Jesus, den du, o Jungfrau, zu Elisabet getragen hast.</li>
	<li>... Jesus, den du, o Jungfrau, in Betlehem geboren hast.</li>
	<li>... Jesus, den du, o Jungfrau, im Tempel geopfert hast.</li>
	<li>... Jesus, den du, o Jungfrau, im Tempel wiedergefunden hast.</li>
</ol>

<h3>Die lichtreichen Geheimnisse <i>(über das Wirken Jesu)</i></h3>
<ol>
	<li>... Jesus, der von Johannes getauft worden ist.</li>
	<li>... Jesus, der sich bei der Hochzeit in Kana geoffenbart hat.</li>
	<li>... Jesus, der uns das Reich Gottes verkündet hat.</li>
	<li>... Jesus, der auf dem Berg verklärt worden ist.</li>
	<li>... Jesus, der uns die Eucharistie geschenkt hat.</li>
</ol>

<h3>Die schmerzhaften Geheimnisse <i>(über das Leiden und Sterben Jesu)</i></h3>
<ol><!-- dolorosa -->
	<li>... Jesus, der für uns Blut geschwitzt hat.</li>
	<li>... Jesus, der für uns gegeißelt worden ist.</li>
	<li>... Jesus, der für uns mit Dornen gekrönt worden ist.</li>
	<li>... Jesus, der für uns das schwere Kreuz getragen hat.</li>
	<li>... Jesus, der für uns gekreuzigt worden ist.</li>
</ol>


<h3>Die glorreichen Geheimnisse <i>(über die Auferstehung Jesu)</i></h3>
<ol><!-- gloriosa -->
	<li>... Jesus, der von den Toten auferstanden ist.</li>
	<li>... Jesus, der in den Himmel aufgefahren ist.</li>
	<li>... Jesus, der uns den Heiligen Geist gesandt hat.</li>
	<li>... Jesus, der dich, o Jungfrau, in den Himmel aufgenommen hat.</li>
	<li>... Jesus, der dich, o Jungfrau, im Himmel gekrönt hat.</li>
</ol>

<h2>Lateinische Geheimnisse</h2>
<p>
Anders als die Geheimnisse in Deutsch ist es üblich beim beten des Rosenkranzes in Latein die Geheimnisse am Anfang der Dekade einmal zu sagen und dann während den Ave Marias diese nur still zu reflektieren.
</p>

<h3>Mystéria gaudiósa (freudenreich)</h3>
<ol lang=la>
	<li>Mystérium gaudiósum prímum: annúntiátió</li>
	<li>Mystérium gaudiósum secundum: vísitátió</li>
	<li>Mystérium gaudiósum tertium: nátívitás Jésú</li>
	<li>Mystérium gaudiósum quártum: præsentátió ínfantis Jésú in templó</li>
	<li>Mystérium gaudiósum quíntum: inventió puerí Jésú in templó</li>
</ol>

<h3>Mystéria dolórósa (schmerzhaft)</h3>
<ol lang=la>
	<li>Mystérium dolórósum prímum: agónía in hortó et sūdor sanguinis</li>
	<li>Mystérium dolórósum secundum: flagellátió</li>
	<li>Mystérium dolórósum tertium: corónátió spínea</li>
	<li>Mystérium dolórósum quártum: via crucis</li>
	<li>Mystérium dolórósum quíntum: mors in cruc</li>
</ol>

<h3>Mystéria glóriósa (glorreich)</h3>
<ol lang=la>
	<li>Mystérium glóriósum prímum: resurréctió</li>
	<li>Mystérium glóriósum secundum: ascénsió</li>
	<li>Mystérium glóriósum tertium: déscénsus spíritūs sánctí</li>
	<li>Mystérium glóriósum quártum: assūmptió beátæ virginis maríæ in cælum</li>
	<li>Mystérium glóriósum quíntum: mundí régnum beátæ virginí maríæ in cælís délátu</li>
</ol>
</div>
