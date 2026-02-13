<script>
	import Prayer from './Prayer.svelte';
	import Paternoster from './Paternoster.svelte';
	import AveMaria from './AveMaria.svelte';
	import GloriaPatri from './GloriaPatri.svelte';

</script>
<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang=la>Ánima Christi, santífica me.</v>{/if}
		{#if urlLang=='de'}<v lang=de>Seele Christi, heilige mich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>Soul of Christ, sanctify me.</v>{/if}
		{#if showLatin}<v lang=la>Corpus Christi, salva me.</v>{/if}
		{#if urlLang=='de'}<v lang=de>Leib Christi, erlöse mich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>Body of Christ, save me.</v>{/if}
		{#if showLatin}<v lang=la>Sanguis Christi, inébria me.</v>{/if}
		{#if urlLang=='de'}<v lang=de>Blut Christi, tränke mich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>Blood of Christ, inebriate me.</v>{/if}
		{#if showLatin}<v lang=la>Aqua láteris Christi, lava me.</v>{/if}
		{#if urlLang=='de'}<v lang=de>Wasser der Seite Christi, wasche mich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>Water from the side of Christ, wash me.</v>{/if}
		{#if showLatin}<v lang=la>Pássio Christi, confórta me.</v>{/if}
		{#if urlLang=='de'}<v lang=de>Leiden Christi, stärke mich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>Passion of Christ, strenghten me.</v>{/if}
		{#if showLatin}<v lang=la>O bone Iesu, exáudi me.</v>{/if}
		{#if urlLang=='de'}<v lang=de>O gütiger Jesus, erhöre mich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>O good Jesus, hear me.</v>{/if}
		{#if showLatin}<v lang=la>Intra tua vúlnera abscónde me.</v>{/if}
		{#if urlLang=='de'}<v lang=de>Verbirg in Deine Wunden mich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>Within Thy wounds hide me.</v>{/if}
		{#if showLatin}<v lang=la>Ne permíttas me separári a te.</v>{/if}
		{#if urlLang=='de'}<v lang=de>Von Dir lass nimmer scheiden mich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>Separated from Thee let me never be.</v>{/if}
		{#if showLatin}<v lang=la>Ab hoste malígno defénde me.</v>{/if}
		{#if urlLang=='de'}<v lang=de>Vor dem bösen Feind beschütze mich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>From the malignant enemeny, defend me.</v>{/if}
		{#if showLatin}<v lang=la>In hora mortis meæ voca me.</v>{/if}
		{#if urlLang=='de'}<v lang=de>In meiner Todesstunde rufe mich,</v>{/if}
		{#if urlLang=='en'}<v lang=en>At the hour of death, call me.</v>{/if}
		{#if showLatin}<v lang=la>Et iube me veníre ad te,</v>{/if}
		{#if urlLang=='de'}<v lang=de>Und heisse zur Dir kommen mich,</v>{/if}
		{#if urlLang=='en'}<v lang=en>And bid me come unto Thee</v>{/if}
		{#if showLatin}<v lang=la>Ut cum Sanctis tuis laudem te</v>{/if}
		{#if urlLang=='de'}<v lang=de>Damit ich möge loben Dich</v>{/if}
		{#if urlLang=='en'}<v lang=en>That with Thy Saints I may praise Thee</v>{/if}
		{#if showLatin}<v lang=la>in sǽcula sæculórum.</v>{/if}
		{#if urlLang=='de'}<v lang=de>Mit Deinen Heiligen ewiglich.</v>{/if}
		{#if urlLang=='en'}<v lang=en>forever and ever.</v>{/if}
		<v lang=und>Amen.</v>
	</p>
	{/snippet}
</Prayer>
