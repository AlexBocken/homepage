<script>
	import Prayer from './Prayer.svelte';
	import GloriaPatri from './GloriaPatri.svelte';
</script>

<Prayer hasLatin={false}>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if urlLang === 'de'}<v lang="de">O Gott, von dem wir alles haben,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O God, from whom we have all things,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">wir preisen Dich für Deine Gaben!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">we praise Thee for Thy gifts!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du speisest uns, weil Du uns liebst,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou feedest us because Thou lovest us;</v>{/if}
		{#if urlLang === 'de'}<v lang="de">drum segne auch, was Du uns gibst. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">so bless what Thou hast given us. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

<p class="prayer-divider"><i>· · ·</i></p>

<Prayer hasLatin={false}>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if urlLang === 'de'}<v lang="de">Komm, Herr Jesus, sei unser Gast,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Come, Lord Jesus, be our guest,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und segne, was Du uns bescheret hast. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and let these gifts to us be blessed. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>

<p class="prayer-divider"><i>· · ·</i></p>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Óculi ómnium in te sperant, Dómine,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Aller Augen warten auf Dich, o Herr,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">The eyes of all hope in Thee, O Lord,</v>{/if}
		{#if showLatin}<v lang="la">et tu das escam illórum in témpore opportúno.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du gibst ihnen Speise zur rechten Zeit.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and Thou givest them meat in due season.</v>{/if}
		{#if showLatin}<v lang="la">Áperis tu manum tuam,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du öffnest Deine milde Hand</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou openest Thy hand,</v>{/if}
		{#if showLatin}<v lang="la">et imples omne ánimal benedictióne.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und erfüllest alles, was da lebt, mit Segen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and fillest every living creature with blessing.</v>{/if}
	</p>
	{/snippet}
</Prayer>

<GloriaPatri />

<p class="prayer-divider"><i>· · ·</i></p>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Bénedic, Dómine, nos et hæc tua dona,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Herr, segne uns und diese Deine Gaben,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Bless us, O Lord, and these Thy gifts,</v>{/if}
		{#if showLatin}<v lang="la">quæ de tua largitáte sumus sumptúri.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">die wir von Deiner Güte nun empfangen werden,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">which we are about to receive from Thy bounty.</v>{/if}
		{#if showLatin}<v lang="la">Per Christum Dóminum nostrum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">durch Christus, unseren Herrn.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Through Christ our Lord.</v>{/if}
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
