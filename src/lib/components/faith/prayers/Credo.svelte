<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Credo in unum <i><sup>⚬</sup></i> Deum, Patrem omnipoténtem,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ich glaub an den einen <i><sup>⚬</sup></i> Gott. Den allmächtigen Vater,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">I believe in one <i><sup>⚬</sup></i> God, the Father almighty,</v>{/if}
		{#if showLatin}<v lang="la">factórem cæli et terræ,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Schöpfer des Himmels und der Erde,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">maker of heaven and earth,</v>{/if}
		{#if showLatin}<v lang="la">visibílium ómnium et invisibílium.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">aller sichtbaren und unsichtbaren Dinge.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">of all things visible and invisible.</v>{/if}
		{#if showLatin}<v lang="la">Et in unum Dóminum <i><sup>⚬</sup></i> Jesum Christum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Und an den einen Herrn <i><sup>⚬</sup></i> Jesus Christus,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">And in one Lord <i><sup>⚬</sup></i> Jesus Christ,</v>{/if}
		{#if showLatin}<v lang="la">Fílium Dei unigénitum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gottes eingeborenen Sohn.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">the Only Begotten Son of God,</v>{/if}
		{#if showLatin}<v lang="la">Et ex Patre natum ante ómnia sǽcula.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Er ist aus dem Vater geboren vor aller Zeit.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">born of the Father before all ages.</v>{/if}
		{#if showLatin}<v lang="la">Deum de Deo,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gott von Gott,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">God from God,</v>{/if}
		{#if showLatin}<v lang="la">lumen de lúmine,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Licht vom Lichte,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Light from Light,</v>{/if}
		{#if showLatin}<v lang="la">Deum verum de Deo vero.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">wahrer Gott vom wahren Gott;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">true God from true God,</v>{/if}
		{#if showLatin}<v lang="la">Génitum, non factum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gezeugt, nicht geschaffen,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">begotten, not made,</v>{/if}
		{#if showLatin}<v lang="la">consubstantiálem Patri:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">eines Wesens mit dem Vater;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">consubstantial with the Father;</v>{/if}
		{#if showLatin}<v lang="la">per quem ómnia facta sunt.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">durch Ihn ist alles geschaffen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">through Him all things were made.</v>{/if}
		{#if showLatin}<v lang="la">Qui propter nos hómines</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Für uns Menschen</v>{/if}
		{#if urlLang === 'en'}<v lang="en">For us men</v>{/if}
		{#if showLatin}<v lang="la">et propter nostram salútem</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und um unsres Heiles willen</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and for our salvation</v>{/if}
		{#if showLatin}<v lang="la">descéndit de cælis.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">ist Er vom Himmel herabgestiegen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">He came down from heaven.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Et incarnátus est de Spíritu Sancto</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Er hat Fleisch angenommen durch den Hl. Geist</v>{/if}
		{#if urlLang === 'en'}<v lang="en">And by the Holy Spirit was incarnate</v>{/if}
		{#if showLatin}<v lang="la">ex <i><sup>⚬</sup></i> María Vírgine:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">aus <i><sup>⚬</sup></i> Maria, der Jungfrau</v>{/if}
		{#if urlLang === 'en'}<v lang="en">of the Virgin <i><sup>⚬</sup></i> Mary,</v>{/if}
		{#if showLatin}<v lang="la">Et homo factus est.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und ist Mensch geworden.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and became man.</v>{/if}
		{#if showLatin}<v lang="la">Crucifíxus étiam pro nobis:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gekreuzigt wurde Er sogar für uns;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">For our sake He was crucified</v>{/if}
		{#if showLatin}<v lang="la">sub Póntio Piláto passus, et sepúltus est.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">unter Pontius Pilatus hat Er den Tod erlitten</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und ist begraben worden</v>{/if}
		{#if urlLang === 'en'}<v lang="en">under Pontius Pilate, He suffered death and was buried.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Et resurréxit tértia die,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Er ist auferstanden am dritten Tage,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">And rose again on the third day</v>{/if}
		{#if showLatin}<v lang="la">secúndum Scriptúras.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">gemäss der Schrift;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">in accordance with the Scriptures.</v>{/if}
		{#if showLatin}<v lang="la">Et ascéndit in cáelum:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Er ist aufgefahren in den Himmel</v>{/if}
		{#if urlLang === 'en'}<v lang="en">He ascended into heaven</v>{/if}
		{#if showLatin}<v lang="la">sedet ad déxteram Patris.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und sitzet zur Rechten des Vaters.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and is seated at the right hand of the Father.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Et íterum ventúrus est cum glória</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Er wird wiederkommen in Herrlichkeit,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">He will come again in glory</v>{/if}
		{#if showLatin}<v lang="la">judicáre vivos et mórtuos:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gericht zu halten über Lebende und Tote:</v>{/if}
		{#if urlLang === 'en'}<v lang="en">to judge the living and the dead</v>{/if}
		{#if showLatin}<v lang="la">cujus regni non erit finis.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">und Seines Reiches wird kein Endes sein.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and His kingdom will have no end.</v>{/if}
	</p>
	<p>
		{#if showLatin}<v lang="la">Et in Spíritum Sanctum,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ich glaube an den Heiligen Geist,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">I believe in the Holy Spirit,</v>{/if}
		{#if showLatin}<v lang="la">Dóminum et vivificántem:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">den Herrn und Lebensspender,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">the Lord, the giver of life,</v>{/if}
		{#if showLatin}<v lang="la">qui ex Patre Filióque procédit.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">der vom Vater und vom Sohne ausgeht.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">who proceeds from the Father and the Son,</v>{/if}
		{#if showLatin}<v lang="la">Qui cum Patre et Fílio simul <i><sup></sup></i> adorátur et conglorificátur:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">zugleich <i><sup></sup></i> angebetet und verherrlicht;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">who with the Father and the Son is <i><sup></sup></i> adored and glorified,</v>{/if}
		{#if showLatin}<v lang="la">qui locútus est per Prophétas.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Er hat gesprochen durch die Propheten.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">who has spoken through the prophets.</v>{/if}
		{#if showLatin}<v lang="la">Et unam sanctam cathólicam et apostólicam Ecclésiam.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ich glaube an die eine, heilige, katholische und apostolische Kirche.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">I believe in one, holy, catholic and apostolic Church.</v>{/if}
		{#if showLatin}<v lang="la">Confíteor unum baptísma</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ich bekenne die eine Taufe</v>{/if}
		{#if urlLang === 'en'}<v lang="en">I confess one Baptism</v>{/if}
		{#if showLatin}<v lang="la">in remissiónem peccatórum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">zur Vergebung der Sünden.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">for the forgiveness of sins</v>{/if}
		{#if showLatin}<v lang="la">Et exspécto resurrectiónem mortuórum.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ich erwarte die Auferstehung der Toten.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">and I look forward to the resurrection of the dead</v>{/if}
		{#if showLatin}<v lang="la"><i>♱</i> Et vitam ventúri sǽculi. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>♱</i> Und das Leben der zukünftigen Welt. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>♱</i> and the life of the world to come. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>
