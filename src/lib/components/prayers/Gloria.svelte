<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if showLatin}<v lang="la">Glória in excélsis <i><sup>⚬</sup></i> Deo.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ehre sei <i><sup>⚬</sup></i> Gott in der Höhe.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Glory to <i><sup>⚬</sup></i> God in the highest.</v>{/if}
		{#if showLatin}<v lang="la">Et in terra pax homínibus</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Und auf Erden Friede den Mesnchen,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">And on earth peace to men</v>{/if}
		{#if showLatin}<v lang="la">bonæ voluntátis.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">die guten Willens sind.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">of good will.</v>{/if}
		{#if showLatin}<v lang="la">Laudámus te.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Wir loben Dich.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">We praise Thee.</v>{/if}
		{#if showLatin}<v lang="la">Benedícimus te.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Wir preisen Dich.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">We bless Thee.</v>{/if}
		{#if showLatin}<v lang="la"><i><sup>⚬</sup></i> Adorámus te.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i><sup>⚬</sup></i> Wir beten Dich an.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i><sup>⚬</sup></i> We adore Thee.</v>{/if}
		{#if showLatin}<v lang="la">Glorificámus te.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Wir verherrlichen Dich.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">We glorify Thee.</v>{/if}
		{#if showLatin}<v lang="la"><i><sup>⚬</sup></i> Grátias ágimus tibi</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i><sup>⚬</sup></i> Wir sagen Dir Dank</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i><sup>⚬</sup></i> We give Thee thanks</v>{/if}
		{#if showLatin}<v lang="la">propter magnam glóriam tuam.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">ob Deiner grossen Herrlichkeit.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">for Thy great glory.</v>{/if}
		{#if showLatin}<v lang="la">Dómine Deus, Rex cæléstis,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Herr und Gott, König des Himmels,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Lord God, heavenly King,</v>{/if}
		{#if showLatin}<v lang="la">Deus Pater omnípotens.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Gott allmächtiger Vater!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">God the Father almighty.</v>{/if}
		{#if showLatin}<v lang="la">Dómine Fili unigénite, <i><sup>⚬</sup></i> Jesu Christe.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Herr <i><sup>⚬</sup></i> Jesus Christus, eingeborener Sohn!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Lord <i><sup>⚬</sup></i> Jesus Christ, the only-begotten Son.</v>{/if}
		{#if showLatin}<v lang="la">Dómine Deus, Agnus Dei,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Herr und Gott, Lamm Gottes,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Lord God, Lamb of God,</v>{/if}
		{#if showLatin}<v lang="la">Fílius Patris.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Sohn des Vaters!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Son of the Father.</v>{/if}
		{#if showLatin}<v lang="la">Qui tollis peccáta mundi,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du nimmst hinweg die Sünden der Welt:</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou who takest away the sins of the world,</v>{/if}
		{#if showLatin}<v lang="la">miserére nobis.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">erbarme Dich unser.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">have mercy on us.</v>{/if}
		{#if showLatin}<v lang="la">Qui tollis peccáta mundi,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du nimmst hinwerg die Sünden der Welt.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou who takest away the sins of the world,</v>{/if}
		{#if showLatin}<v lang="la"><i><sup>⚬</sup></i> súscipe depreciatiónem nostram.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i><sup>⚬</sup></i> nimm unser Flehen gnädig auf.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i><sup>⚬</sup></i> receive our prayer.</v>{/if}
		{#if showLatin}<v lang="la">Qui sedes ad déxteram Patris,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du sitzt zur Rechten des Vaters:</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou who sittest at the right hand of the Father,</v>{/if}
		{#if showLatin}<v lang="la">miserére nobis.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">erbarme Dich unser.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">have mercy on us.</v>{/if}
		{#if showLatin}<v lang="la">Quóniam tu solus Sanctus.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Denn Du allein bist der Heilige.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">For Thou alone art holy.</v>{/if}
		{#if showLatin}<v lang="la">Tu solus Altíssimus,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du allein der Höchste,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou alone art the Most High,</v>{/if}
		{#if showLatin}<v lang="la"><i><sup>⚬</sup></i> Jesu Christe.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i><sup>⚬</sup></i> Jesus Christus,</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i><sup>⚬</sup></i> Jesus Christ.</v>{/if}
		{#if showLatin}<v lang="la">Cum Sancto Spíritu</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Mit dem Hl. Geiste,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">With the Holy Spirit,</v>{/if}
		{#if showLatin}<v lang="la"><i>♱</i> in glória Dei Patris. Amen.</v>{/if}
		{#if urlLang === 'de'}<v lang="de"><i>♱</i> in der Herrlichkeit Gottes des Vaters. Amen.</v>{/if}
		{#if urlLang === 'en'}<v lang="en"><i>♱</i> in the glory of God the Father. Amen.</v>{/if}
	</p>
	{/snippet}
</Prayer>
