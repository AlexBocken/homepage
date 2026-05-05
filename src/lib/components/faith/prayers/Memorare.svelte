<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Meménto, o piíssima Virgo María, non esse audítum a sǽculo,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gedenke, o gütigste Jungfrau Maria, es ist noch nie gehört worden,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Remember, O most gracious Virgin Mary, that never was it known</v>{/if}
		{#if showLatin}<v lang="la">quemquam ad tua curréntem præsídia, tua implorántem auxília,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dass jemand, der zu dir seine Zuflucht nahm, deine Hilfe anrief</v>{/if}
		{#if urlLang === 'en'}<v lang="en">that anyone who fled to thy protection, implored thy help,</v>{/if}
		{#if showLatin}<v lang="la">tua peténtem suffrágia, esse derelíctum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und um deine Fürbitte flehte, von dir verlassen worden ist.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">or sought thine intercession, was left unaided.</v>{/if}
		{#if showLatin}<v lang="la">Ego tali animátus confidéntia, ad te, Virgo Vírginum, Mater, curro,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Von diesem Vertrauen beseelt, nehme ich meine Zuflucht zu dir, o Jungfrau der Jungfrauen, meine Mutter.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Inspired by this confidence, I fly unto thee, O Virgin of virgins, my Mother;</v>{/if}
		{#if showLatin}<v lang="la">ad te vénio, coram te gemens peccátor assísto.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Zu dir komme ich, vor dir stehe ich als ein sündiger Mensch.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to thee do I come, before thee I stand, sinful and sorrowful.</v>{/if}
		{#if showLatin}<v lang="la">Noli, Mater Verbi, verba mea despícere;</v>{/if}
		{#if urlLang === 'de'}<v lang="de">O Mutter des Ewigen Wortes, verschmähe nicht meine Worte,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O Mother of the Word Incarnate, despise not my petitions,</v>{/if}
		{#if showLatin}<v lang="la">sed audi propítia et exáudi.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">sondern höre sie gnädig an und erhöre mich.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">but in thy mercy hear and answer me.</v>{/if}
		<v lang="und">Amen.</v>
	</p>
	{/snippet}
</Prayer>
