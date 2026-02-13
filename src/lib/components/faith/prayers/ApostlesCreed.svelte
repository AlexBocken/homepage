<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Credo in Deum Patrem omnipoténtem,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ich glaube an Gott, den Vater, den Allmächtigen,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">I believe in God, the Father almighty,</v>{/if}
		{#if showLatin}<v lang="la">Creatórem cæli et terræ.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">den Schöpfer des Himmels und der Erde.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Creator of heaven and earth.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Et in Iesum Christum, Fílium eius únicum, Dóminum nostrum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Und an Jesus Christus, seinen eingeborenen Sohn, unsern Herrn,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">And in Jesus Christ, His only Son, our Lord,</v>{/if}
		{#if showLatin}<v lang="la">qui concéptus est de Spíritu Sancto,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">der empfangen ist vom Heiligen Geist,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">who was conceived by the Holy Spirit,</v>{/if}
		{#if showLatin}<v lang="la">natus ex María Vírgine,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">geboren von der Jungfrau Maria,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">born of the Virgin Mary,</v>{/if}
		{#if showLatin}<v lang="la">passus sub Póntio Piláto,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">gelitten unter Pontius Pilatus,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">suffered under Pontius Pilate,</v>{/if}
		{#if showLatin}<v lang="la">crucifíxus, mórtuus, et sepúltus,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">gekreuzigt, gestorben und begraben,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">was crucified, died, and was buried.</v>{/if}
		{#if showLatin}<v lang="la">descéndit ad ínferos,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">hinabgestiegen in das Reich des Todes,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">He descended into hell.</v>{/if}
		{#if showLatin}<v lang="la">tértia die resurréxit a mórtuis,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">am dritten Tage auferstanden von den Toten,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">On the third day He rose again from the dead.</v>{/if}
		{#if showLatin}<v lang="la">ascéndit ad cælos,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">aufgefahren in den Himmel,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">He ascended into heaven,</v>{/if}
		{#if showLatin}<v lang="la">sedet ad déxteram Dei Patris omnipoténtis,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">er sitzet zur Rechten Gottes, des allmächtigen Vaters;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and sits at the right hand of God the Father almighty.</v>{/if}
		{#if showLatin}<v lang="la">inde ventúrus est iudicáre vivos et mórtuos.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">von dort wird er kommen, zu richten die Lebenden und die Toten.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">From thence He shall come to judge the living and the dead.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Credo in Spíritum Sanctum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ich glaube an den Heiligen Geist,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">I believe in the Holy Spirit,</v>{/if}
		{#if showLatin}<v lang="la">sanctam Ecclésiam cathólicam,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">die heilige katholische Kirche,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">the holy catholic Church,</v>{/if}
		{#if showLatin}<v lang="la">sanctórum communiónem,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gemeinschaft der Heiligen,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">the communion of saints,</v>{/if}
		{#if showLatin}<v lang="la">remissiónem peccatórum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Vergebung der Sünden,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">the forgiveness of sins,</v>{/if}
		{#if showLatin}<v lang="la">carnis resurrectiónem,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Auferstehung der Toten</v>{/if}
		{#if urlLang === 'en'}<v lang="en">the resurrection of the body,</v>{/if}
		{#if showLatin}<v lang="la">vitam ætérnam. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und das ewige Leben. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and life everlasting. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>
