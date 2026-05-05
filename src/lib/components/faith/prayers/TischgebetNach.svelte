<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer hasLatin={false}>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if urlLang === 'de'}<v lang="de">Dir sei, o Gott, für Speis' und Trank,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">To Thee, O God, for food and drink,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">für alles Gute Lob und Dank.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">for all good things, be praise and thanks.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du gabst, Du wirst auch ferner geben,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou hast given, Thou wilt give still more,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Dich preise unser ganzes Leben! Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">may our whole life praise Thee! Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

<p class="prayer-divider"><i>· · ·</i></p>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Ágimus tibi grátias, omnípotens Deus,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Wir danken Dir, allmächtiger Gott,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">We give Thee thanks, almighty God,</v>{/if}
		{#if showLatin}<v lang="la">pro univérsis benefíciis tuis:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">für all Deine Wohltaten,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">for all Thy benefits:</v>{/if}
		{#if showLatin}<v lang="la">Qui vivis et regnas in sǽcula sæculórum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">der Du lebst und herrschest von Ewigkeit zu Ewigkeit.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Who livest and reignest, world without end.</v>{/if}
		<v lang="und">Amen.</v>
	</p>
	{/snippet}
</Prayer>

<p class="prayer-divider"><i>· · ·</i></p>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Retribúere dignáre, Dómine,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Herr, vergilt allen,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Vouchsafe, O Lord, to reward</v>{/if}
		{#if showLatin}<v lang="la">ómnibus, nobis bona faciéntibus propter nomen tuum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">die uns um Deines Namens willen Gutes getan haben,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">all those who do good to us for Thy name's sake</v>{/if}
		{#if showLatin}<v lang="la">vitam ætérnam.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">mit dem ewigen Leben.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">with eternal life.</v>{/if}
		<v lang="und">Amen.</v>
	</p>
	{/snippet}
</Prayer>

<style>
	.prayer-divider {
		text-align: center;
		color: grey;
		margin: 0.5em 0;
		letter-spacing: 0.5em;
	}
</style>
