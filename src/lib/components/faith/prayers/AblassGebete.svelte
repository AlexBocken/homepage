<script>
	import Prayer from './Prayer.svelte';
	import Paternoster from './Paternoster.svelte';
	import AveMaria from './AveMaria.svelte';
	import GloriaPatri from './GloriaPatri.svelte';

	export let verbose = false;
</script>

	<Prayer>
		{#snippet children(showLatin, urlLang)}
		<div class="monolingual">
		<p>
			<v lang=de>
			Seele Christi, heilige mich.
			<i>✻</i>
			Leib Christi erlöse mich.
			<i>✻</i>
			Blut Christi, tränke mich.
			<i>✻</i>
			Wasser der Seite Christi, wasche mich.
			<i>✻</i>
			Leiden Christi, stärke mich.
			<i>✻</i>
			O gütiger Jesus, erhöre mich.
			<i>✻</i>
			Verbirg in Deine Wunden mich.
			<i>✻</i>
			Von Dir lass nimmer scheiden mich.
			<i>✻</i>
			In meiner Todesstunde rufe mich,
			<i>✻</i>
			Und heisse zur Dir kommen mich,
			<i>✻</i>
			Damit ich möge loben Dich
			<i>✻</i>
			Mit Deinen Heiligen ewiglich. Amen.
			</v>
		</p>
		</div>
		<h3> Vollkommener Ablass</h3>
		<h4> Paternoster </h4>
		{#if verbose }
			<Paternoster />
		{/if}
		<h4> Ave Maria </h4>
		{#if verbose }
			<AveMaria />
		{/if}
		<h4> Gloria Patri </h4>
		{#if verbose }
			<GloriaPatri />
		{/if}
		<p>
			{#if showLatin}
				<v lang=la >En ego, o bone et dulcíssime Jesu, ante contspéctum tuum génibusme provólvo ac máximo ánimi ardóre te oro atque obtéstor, ut meum in in cor vívidos fídei, spei et caritátis sensus, atque veram peccatórum meórum pœniténtiam, éaque emendándi firmíssimam voluntátem velis imprímere; dum magno ánimi afféctu et dolóre tua quinque vúlnera mecum ipse consídero ac mente contémplor, illud præ óculis habens, quod jam in ore ponébat tuo David Prophéta de te, o bone Jesu: Fodérunt manus meas et pedes meos; dinumeravérunt ómnio ossa mea (Ps. 21, 17-18)</v>
			{/if}
			<v lang=de>
			Siehe, o gütiger und milder Jesus, ich werfe mich vor Deinen Augen auf die Knie. Inbrünstig bitte und beschwöre ich Dich: Präge meinem Herzen lebendige Gefühle des Glaubens, der Hoffung und der Liebe ein sowie wahre Reue über meine Sünden und den ganz festen Willen, mich zu bessern. Voll Liebe und Schmerz schaue ich Deine fünf Wunden und betrachte sie in meinem Geiste. Dabei halte ich mir vor Augen, was im Hinblick auf Dich, o guter Jesus, schon der Prophet David Dir in den Mund legte: «Sie haben Meine Hände und Meine Füsse durchbohrt; alle meine Gebeine haben sie gezählt.» (Ps. 21, 17-18)
			</v>

		</p>
		{/snippet}
	</Prayer>
