<script lang="ts">
	/**
	 * Where the Hail Mary and the Angelus come from: the verses of Luke (and
	 * Matthew and John) they quote, and how each prayer took its present
	 * shape. Sits under the prayer card on its own page, not on the listing —
	 * a footnote, not a headline. Every citation is a `ScriptureRef` or
	 * `CccRef`, so it peeks through the page's `ReferencePeeks`.
	 *
	 * German and English only; the page leaves it out under /fides.
	 */
	import ScriptureRef from '$lib/components/faith/bible/ScriptureRef.svelte';
	import CccRef from '$lib/components/faith/ccc/CccRef.svelte';
	import { resolve } from '$app/paths';
	import { faithSlugFromLang, prayersSlug, type FaithLang } from '$lib/js/faithI18n';

	interface Props {
		prayer: 'aveMaria' | 'angelus';
		lang: FaithLang;
	}
	const { prayer, lang }: Props = $props();
	const isEnglish = $derived(lang === 'en');
	const prayerHref = (slug: string) => resolve('/[faithLang=faithLang]/[prayers=prayersLang]/[prayer]', { faithLang: faithSlugFromLang(lang), prayers: prayersSlug(lang), prayer: slug });
	const aveHref = $derived(prayerHref(isEnglish ? 'hail-mary' : 'ave-maria'));
	const reginaHref = $derived(prayerHref('regina-caeli'));
</script>

<aside class="scripture-note" lang={isEnglish ? 'en' : 'de'} aria-labelledby="scripture-note-title">
	{#if prayer === 'aveMaria'}
		{#if isEnglish}
			<h2 id="scripture-note-title">Where the words come from</h2>
			<p>
				The first half of the Hail Mary is the Gospel of Luke almost word for word. <q>Hail, full of grace, the Lord is with thee</q> is the angel Gabriel's greeting at the Annunciation (<ScriptureRef reference="Lk 1:28" />), and <q>blessed art thou among women, and blessed is the fruit of thy womb</q> is what Elizabeth cries out when Mary comes to her door (<ScriptureRef reference="Lk 1:42" />). In the Vulgate, and so in the Douay-Rheims, the angel already adds <q>blessed art thou among women</q>; in most Greek manuscripts those words are Elizabeth's alone. The prayer adds only the two names: <q>Mary</q> after the greeting and <q>Jesus</q> after <q>thy womb</q>. The Catechism reads the prayer along this same seam (<CccRef n={2676} />).
			</p>
			<p>
				The second half is the Church's own petition, not a quotation. <q>Mother of God</q> says what Elizabeth means by <q>the mother of my Lord</q> (<ScriptureRef reference="Lk 1:43" />) and what the Council of Ephesus defined in 431; <q>pray for us sinners, now and at the hour of our death</q> hands the two moments that matter most to her intercession (<CccRef n={2677} />).
			</p>
			<p>
				The angel's greeting joined to Elizabeth's was sung early on as an antiphon, the offertory of the fourth Sunday of Advent and of the Annunciation. As a prayer of its own it surfaces around 1050, growing out of the versicles of the Little Office of Our Lady, and about 1196 Odo de Sully, bishop of Paris, ordered that every parishioner know it alongside the Our Father and the Creed. The petition grew onto it in the fifteenth century, at first in varying wordings, and the whole prayer in its present form was fixed in the Roman Breviary of Pius V in 1568.
			</p>
		{:else}
			<h2 id="scripture-note-title">Woher die Worte stammen</h2>
			<p>
				Die erste Hälfte des Ave Maria ist fast Wort für Wort Lukasevangelium. <q>Gegrüsset seist du, voll der Gnade, der Herr ist mit dir</q> ist der Gruss des Engels Gabriel bei der Verkündigung (<ScriptureRef reference="Lk 1,28" />), und <q>du bist gebenedeit unter den Frauen, und gebenedeit ist die Frucht deines Leibes</q> ruft Elisabeth aus, als Maria zu ihr kommt (<ScriptureRef reference="Lk 1,42" />). In der Vulgata, und darum auch bei Allioli, sagt schon der Engel <q>du bist gebenedeit unter den Frauen</q>; in den meisten griechischen Handschriften gehören diese Worte allein Elisabeth. Das Gebet fügt nur die beiden Namen hinzu: <q>Maria</q> nach dem Gruss und <q>Jesus</q> nach <q>deines Leibes</q>. Der Katechismus liest das Gebet an derselben Naht entlang (<CccRef n={2676} />).
			</p>
			<p>
				Die zweite Hälfte ist die Bitte der Kirche, kein Zitat. <q>Mutter Gottes</q> sagt, was Elisabeth mit <q>die Mutter meines Herrn</q> meint (<ScriptureRef reference="Lk 1,43" />) und was das Konzil von Ephesus 431 festgelegt hat; <q>bitte für uns Sünder, jetzt und in der Stunde unseres Todes</q> legt die beiden entscheidenden Augenblicke in ihre Fürsprache (<CccRef n={2677} />).
			</p>
			<p>
				Der Gruss des Engels, an den Elisabeths Worte angefügt sind, wurde früh als Antiphon gesungen, als Offertorium des vierten Adventssonntags und des Festes der Verkündigung. Als eigenes Gebet taucht er um 1050 auf, herausgewachsen aus den Versikeln des kleinen Marienoffiziums; um 1196 verlangte Odo von Sully, Bischof von Paris, dass jeder Gläubige es neben Vaterunser und Credo kenne. Die Bitte wuchs im 15. Jahrhundert an, zunächst in wechselndem Wortlaut, und das ganze Gebet in seiner heutigen Fassung wurde 1568 im Römischen Brevier Pius' V. festgeschrieben.
			</p>
		{/if}
	{:else if isEnglish}
		<h2 id="scripture-note-title">Where the words come from</h2>
		<p>
			The Angelus is the Annunciation told in three sentences, each answered with a Hail Mary. The first versicle condenses the angel's message (<ScriptureRef reference="Lk 1:26-38" />); <q>conceived of the Holy Spirit</q> is Matthew's phrase for the same event (<ScriptureRef reference="Mt 1:18" />, <ScriptureRef reference="Mt 1:20" />) and the angel's own promise (<ScriptureRef reference="Lk 1:35" />). The second is Mary's answer word for word (<ScriptureRef reference="Lk 1:38" />). The third is John's summary of the whole Incarnation (<ScriptureRef reference="Jn 1:14" />). The <a href={aveHref}>Hail Mary</a> between them is itself Luke, the angel's greeting and Elizabeth's (<ScriptureRef reference="Lk 1:28" />, <ScriptureRef reference="Lk 1:42" />). Only the closing versicle and the collect are the Church's own words, and the collect is older than the Angelus by centuries: it is the postcommunion of the Mass of the Annunciation in the Roman Missal.
		</p>
		<p>
			The prayer grew out of bells. In the thirteenth century the evening bell for Compline became the signal for three Hail Marys, a custom the Franciscans spread; Pope John XXII attached indulgences to it in 1318 and 1327. A morning bell followed within a generation, first recorded at Parma in 1318. The midday bell was at first rung on Fridays only, in memory of the Passion, and became a daily bell for peace in France under Louis XI in the 1470s. The three versicles first appear in print in a Venetian catechism of 1560; the full form said today, with the collect, cannot be traced back before 1612. In 1742 Benedict XIV ordered that in Eastertide the <a href={reginaHref}>Regina Caeli</a> take its place, said standing.
		</p>
	{:else}
		<h2 id="scripture-note-title">Woher die Worte stammen</h2>
		<p>
			Der Angelus ist die Verkündigung in drei Sätzen, auf jeden antwortet ein Ave Maria. Der erste Versikel fasst die Botschaft des Engels zusammen (<ScriptureRef reference="Lk 1,26-38" />); <q>empfangen vom Heiligen Geist</q> ist die Wendung, mit der Matthäus dasselbe Ereignis erzählt (<ScriptureRef reference="Mt 1,18" />, <ScriptureRef reference="Mt 1,20" />), und die Zusage des Engels selbst (<ScriptureRef reference="Lk 1,35" />). Der zweite ist Marias Antwort Wort für Wort (<ScriptureRef reference="Lk 1,38" />). Der dritte ist der Satz, in dem Johannes die ganze Menschwerdung zusammenfasst (<ScriptureRef reference="Joh 1,14" />). Das <a href={aveHref}>Ave Maria</a> dazwischen ist selbst Lukas, der Gruss des Engels und der Elisabeths (<ScriptureRef reference="Lk 1,28" />, <ScriptureRef reference="Lk 1,42" />). Nur der Schlussversikel und die Oration sind Worte der Kirche, und die Oration ist Jahrhunderte älter als der Angelus: sie ist die Postcommunio der Messe von der Verkündigung im Römischen Messbuch.
		</p>
		<p>
			Das Gebet ist aus Glocken gewachsen. Im 13. Jahrhundert wurde die Abendglocke zur Komplet das Zeichen für drei Ave Maria, ein Brauch, den die Franziskaner verbreiteten; Papst Johannes XXII. verband ihn 1318 und 1327 mit Ablässen. Eine Morgenglocke folgte innerhalb einer Generation, erstmals 1318 in Parma bezeugt. Die Mittagsglocke wurde zuerst nur freitags geläutet, zum Gedächtnis des Leidens Christi, und wurde in Frankreich unter Ludwig XI. in den 1470er-Jahren zur täglichen Friedensglocke. Die drei Versikel stehen erstmals 1560 in einem venezianischen Katechismus gedruckt; die heute gebetete volle Form mit der Oration lässt sich nicht vor 1612 nachweisen. 1742 ordnete Benedikt XIV. an, dass in der Osterzeit das <a href={reginaHref}>Regina Caeli</a> an seine Stelle tritt, stehend gebetet.
		</p>
	{/if}
</aside>

<style>
	.scripture-note {
		max-width: 700px;
		margin: 2.5rem auto 1rem;
		padding: 0 0.25rem;
		font-size: 0.92rem;
		line-height: 1.6;
		color: var(--color-text-secondary);
	}
	.scripture-note h2 {
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-tertiary);
		margin: 0 0 0.6rem;
	}
	.scripture-note p {
		margin: 0 0 0.9rem;
		text-align: left;
	}
	.scripture-note a {
		color: inherit;
		text-decoration: underline;
		text-decoration-color: color-mix(in srgb, var(--red) 45%, transparent);
		text-underline-offset: 0.15em;
	}
	.scripture-note a:hover {
		color: var(--red);
	}
	.scripture-note q {
		quotes: '“' '”';
	}
	.scripture-note q:lang(de) {
		quotes: '„' '“';
	}
</style>
