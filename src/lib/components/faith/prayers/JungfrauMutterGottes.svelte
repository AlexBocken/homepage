<script>
	import Prayer from './Prayer.svelte';
</script>

<Prayer hasLatin={false}>
	{#snippet children(showLatin, urlLang)}
	<p>
		{#if urlLang === 'de'}<v lang="de">Jungfrau, Mutter Gottes mein,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Virgin, Mother of God of mine,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">lass mich ganz dein Eigen sein!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">let me be wholly thine own!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Dein im Leben, dein im Tod,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thine in life, thine in death,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dein in Unglück, Angst und Not;</v>{/if}
		{#if urlLang === 'en'}<v lang="en">thine in misfortune, fear and need;</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dein in Kreuz und bitt'rem Leid,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">thine in cross and bitter sorrow,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">dein für Zeit und Ewigkeit.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">thine for time and eternity.</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Jungfrau, Mutter Gottes mein,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Virgin, Mother of God of mine,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">lass mich ganz dein Eigen sein!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">let me be wholly thine own!</v>{/if}
	</p>
	<p>
		{#if urlLang === 'de'}<v lang="de">Mutter, auf dich hoff' und baue ich!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Mother, in thee I hope and trust!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Mutter, zu dir ruf' und seufze ich!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Mother, to thee I call and sigh!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Mutter, du Gütigste, steh mir bei!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Mother, most kind, stand by me!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Mutter, du Mächtigste, Schutz mir verleih!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Mother, most mighty, grant me protection!</v>{/if}
	</p>
	<p>
		{#if urlLang === 'de'}<v lang="de">O Mutter, so komm, hilf beten mir!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O Mother, come and help me pray!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">O Mutter, so komm, hilf streiten mir!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O Mother, come and help me strive!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">O Mutter, so komm, hilf leiden mir!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O Mother, come and help me suffer!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">O Mutter, so komm und bleib bei mir!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O Mother, come and stay with me!</v>{/if}
	</p>
	<p>
		{#if urlLang === 'de'}<v lang="de">Du kannst mir ja helfen, o Mächtigste!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou canst help me, O most mighty!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du willst mir ja helfen, o Gütigste!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou wilt help me, O most kind!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du musst mir nun helfen, o Treueste!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou must help me now, O most faithful!</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Du wirst mir auch helfen, Barmherzigste!</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Thou wilt help me also, O most merciful!</v>{/if}
	</p>
	<p>
		{#if urlLang === 'de'}<v lang="de">O Mutter der Gnade, der Christen Hort,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">O Mother of grace, refuge of Christians,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">du Zuflucht der Sünder, des Heiles Pfort',</v>{/if}
		{#if urlLang === 'en'}<v lang="en">refuge of sinners, gate of salvation,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">du Hoffnung der Erde, des Himmels Zier,</v>{/if}
		{#if urlLang === 'en'}<v lang="en">hope of the earth, ornament of heaven,</v>{/if}
		{#if urlLang === 'de'}<v lang="de">du Trost der Betrübten, ihr Schutzpanier.</v>{/if}
		{#if urlLang === 'en'}<v lang="en">comfort of the afflicted, their shielding banner.</v>{/if}
	</p>
	<p>
		{#if urlLang === 'de'}<v lang="de">Wer hat je umsonst deine Hilf' angefleht?</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Who has ever begged thy help in vain?</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Wann hast du vergessen ein kindlich' Gebet?</v>{/if}
		{#if urlLang === 'en'}<v lang="en">When hast thou forgotten a childlike prayer?</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Drum ruf' ich beharrlich in Kreuz und in Leid:</v>{/if}
		{#if urlLang === 'en'}<v lang="en">Therefore I call out steadfastly in cross and sorrow:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">„Maria hilft immer! Sie hilft jederzeit!"</v>{/if}
		{#if urlLang === 'en'}<v lang="en">"Mary helps always! She helps at all times!"</v>{/if}
		{#if urlLang === 'de'}<v lang="de">Ich ruf' voll Vertrauen in Leiden und Tod:</v>{/if}
		{#if urlLang === 'en'}<v lang="en">I call full of trust in suffering and death:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">„Maria hilft immer, in jeglicher Not!"</v>{/if}
		{#if urlLang === 'en'}<v lang="en">"Mary helps always, in every distress!"</v>{/if}
		{#if urlLang === 'de'}<v lang="de">So glaub' ich und lebe und sterbe darauf:</v>{/if}
		{#if urlLang === 'en'}<v lang="en">So I believe and live and die upon it:</v>{/if}
		{#if urlLang === 'de'}<v lang="de">„Maria hilft mir in den Himmel hinauf."</v>{/if}
		{#if urlLang === 'en'}<v lang="en">"Mary helps me up into heaven."</v>{/if}
	</p>
	{/snippet}
</Prayer>
