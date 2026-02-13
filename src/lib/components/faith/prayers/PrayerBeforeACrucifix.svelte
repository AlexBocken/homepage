<script>
	import Prayer from './Prayer.svelte';
	import Paternoster from './Paternoster.svelte';
	import AveMaria from './AveMaria.svelte';
	import GloriaPatri from './GloriaPatri.svelte';
</script>

	<Prayer>
		{#snippet children(showLatin, urlLang)}
		<p>
			{#if showLatin}<v lang=la>En ego, o bone et dulcíssime Jesu,</v>{/if}
			{#if urlLang=='de'}<v lang=de>Siehe, o gütiger und milder Jesus,</v>{/if}
			{#if urlLang=='en'}<v lang=en>Behold, O good and sweetest Jesus,</v>{/if}
			{#if showLatin}<v lang=la>ante conspéctum tuum génibus me provólvo </v>{/if}
			{#if urlLang=='de'}<v lang=de>ich werfe mich vor Deinen Augen auf die Knie. </v>{/if}
			{#if urlLang=='en'}<v lang=en>I cast myself upon my knees in Thy sight,</v>{/if}
			{#if showLatin}<v lang=la>ac máximo ánimi ardóre te oro atque obtéstor, </v>{/if}
			{#if urlLang=='de'}<v lang=de>Inbrünstig bitte und beschwöre ich Dich:</v>{/if}
			{#if urlLang=='en'}<v lang=en>and with the most fervent desire of my soul I pray and beseech Thee</v>{/if}
			{#if showLatin}<v lang=la> ut meum in in cor vívidos fídei, spei et caritátis sensus, atque veram peccatórum meórum pœniténtiam,</v>{/if}
			{#if urlLang=='de'}<v lang=de>Präge meinem Herzen lebendige Gefühle des Glaubens, der Hoffung und der Liebe ein</v>{/if}
			{#if urlLang=='en'}<v lang=en>to impress upon my heart lively sentiments of faith, hope and charity,</v>{/if}
			{#if showLatin}	<v lang=la>éaque emendándi firmíssimam voluntátem velis</v>{/if}
			{#if urlLang=='de'}<v lang=de>sowie wahre Reue über meine Sünden und den ganz festen Willen, mich zu bessern.</v>{/if}
			{#if urlLang=='en'}<v lang=en>with true repentance for my sins and a most firm desire of amendment:</v>{/if}
			{#if showLatin}	<v lang=la> imprímere; dum magno ánimi afféctu et dolóre tua quinque vúlnera mecum ipse consídero ac mente contémplor,</v>{/if}
			{#if urlLang=='de'}<v lang=de>Voll Liebe und Schmerz schaue ich Deine fünf Wunden und betrachte sie in meinem Geiste.</v>{/if}
			{#if urlLang=='en'}<v lang=en>whilst with deep affection and grief of soul I consider within myself and mentally contemplate Thy five most precious Wounds,</v>{/if}
			{#if showLatin}<v lang=la>illud præ óculis habens, quod jam in ore ponébat tuo David Prophéta de te, o bone Jesu:</v>{/if}
			{#if urlLang=='de'}<v lang=de>Dabei halte ich mir vor Augen, was im Hinblick auf Dich, o guter Jesus, schon der Prophet David Dir in den Mund legte:</v>{/if}
			{#if urlLang=='en'}<v lang=en>having before mine eyes that which David, the prophet, long ago spoke in Thine Own person concerning Thee, my Jesus:</v>{/if}
			{#if showLatin}<v lang=la> «Fodérunt manus meas et pedes meos; dinumeravérunt ómnio ossa mea.» (Ps. 21, 17-18)</v>{/if}
			{#if urlLang=='de'}<v lang=de>«Sie haben Meine Hände und Meine Füsse durchbohrt; alle meine Gebeine haben sie gezählt.» (Ps. 21, 17-18)</v>{/if}
			{#if urlLang=='en'}<v lang=en>"They have pierced My hands and My feet, they have numbered all My bones." (Ps. 21:17-18</v>{/if}
			<v lang=und>Amen.</v>
		</p>
		{/snippet}
	</Prayer>
