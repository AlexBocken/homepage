<script>
	import "$lib/css/christ.css";
	import "$lib/css/nordtheme.css";
	import Gebet from "./Gebet.svelte";
</script>
<style>
.ccontainer{
	margin: auto;
	overflow-x: visible;
	max-width: 1000px;
}
.container{
	column-count: 2;
	column-gap: 1em;
}
@media (max-width: 800px) {
	.container{
		column-count: 1;
		padding-left: calc((100% - 600px ) * 0.5); /* ugly*/
	}
}
:global(.container > *){
	break-inside: avoid-column; /* Prevent children from splitting across columns */
	margin-bottom: 1em;
}
h1{
	text-align: center;
	font-size: 3rem;
}
</style>
<h1>Gebete</h1>


<div class="ccontainer">
<div class=container>

<Gebet name={"Das heilige Kreuzzeichen"} is_bilingue={true} >
	<p>
	<v lang=la>In nómine <i>♱</i> Patris, et Fílii, et Spíritus Sancti. Amen.</v>
	<v lang=de>Im Namen des <i>♱</i> Vaters und des Sohnes und des Heiligen Geistes. Amen.</v>
	</p>
</Gebet>

<Gebet name={"Glória Patri"} is_bilingue={true}>
	<p>
	<v lang=la>Glória Patri, et Fílio, et Spirítui Sancto.</v>
	<v lang=de>Ehre sei dem Vater und dem Sohne und dem Hl. Geiste.</v>
	<v lang=la>Sicute erat in princípio, et nunc, et semper:</v>
	<v lang=de>Wie es war am Anfang, so auch jetzt und allezeit</v>
	<v lang=la>et in sǽcula sæculórum. Amen.</v>
	<v lang=de>und in Ewigkeit. Amen.</v>
	</p>
</Gebet>

<Gebet name={"Paternoster"} is_bilingue={true} >
	<p>
	<v lang=la>Pater noster, qui es in cælis</v>
	<v lang=de>Vater unser, der Du bist im Himmel,</v>
	<v lang=la>Sanctificétur nomen tuum</v>
	<v lang=de>geheiligt werde Dein Name;</v>
	<v lang=la>Advéniat regnum tuum</v>
	<v lang=de>zu uns komme Dein Reich;</v>
	<v lang=la>Fiat volúntas tua, sicut in cælo, et in terra.</v>
	<v lang=de>Dein Wille geschehe, wie im Himmel, also auch auf Erden!</v>
	<v lang=la>Panem nostrum quotidiánum da nobis hódie.</v>
	<v lang=de>Unser tägliches Brot gib uns heute;</v>
	<v lang=la>Et dimítte nobis debíta nostra,</v>
	<v lang=de>und vergib uns unsere Schulden,</v>
	<v lang=la>sicut et nos dimíttimus debitóribus nostris.</v>
	<v lang=de>wie auch wir vergeben unsern Schuldigern;</v>
	<v lang=la>Et ne nos indúcas in tentatiónem.</v>
	<v lang=de>und führe uns nicht in Versuchung.</v>
	<v lang=la>Sed líbera nos a malo. Amen.</v>
	<v lang=de>Sondern erlöse uns von dem Übel. Amen.</v>
	</p>
</Gebet>

<Gebet name={"Credo"} is_bilingue={true}>
	<p>
	<v lang=la>Credo in unum <i><sup>⚬</sup></i> Deum, Patrem omnipoténtem,</v>
	<v lang=de>Ich glaub an den einen <i><sup>⚬</sup></i> Gott. Den allmächtigen Vater,</v>
	<v lang=la>factórem cæli et terræ,</v>
	<v lang=de>Schöpfer des Himmels und der Erde,</v>
	<v lang=la>visibílium ómnium et invisibílium.</v>
	<v lang=de>aller sichtbaren und unsichtbaren Dinge.</v>
	<v lang=la>Et in unum Dóminum <i><sup>⚬</sup></i> Jesum Christum,</v>
	<v lang=de>Und an den einen Herrn <i><sup>⚬</sup></i> Jesus Christus,</v>
	<v lang=la>Fílium Dei unigénitum.</v>
	<v lang=de>Gottes eingeborenen Sohn.</v>
	<v lang=la>Et ex Patre natum ante ómnia sǽcula.</v>
	<v lang=de>Er ist aus dem Vater geboren vor aller Zeit.</v>
	<v lang=la>Deum de Deo,</v>
	<v lang=de>Gott von Gott,</v>
	<v lang=la>lumen de lúmine,</v>
	<v lang=de>Licht vom Lichte,</v>
	<v lang=la>Deum verum de Deo vero.</v>
	<v lang=de>wahrer Gott vom wahren Gott;</v>
	<v lang=la>Génitum, non factum,</v>
	<v lang=de>Gezeugt, nicht geschaffen,</v>
	<v lang=la>consubstantiálem Patri:</v>
	<v lang=de>eines Wesens mit dem Vater;</v>
	<v lang=la>per quem ómnia facta sunt.</v>
	<v lang=de>durch Ihn ist alles geschaffen.</v>
	<v lang=la>Qui propter nos hómines</v>
	<v lang=de>Für uns Menschen</v>
	<v lang=la>et propter nostram salútem</v>
	<v lang=de>und um unsres Heiles willen</v>
	<v lang=la>descéndit de cælis.</v>
	<v lang=de>ist Er vom Himmel herabgestiegen.</v>
	</p>
	<p>
	<v lang=la>Et incarnátus est de Spíritu Sancto</v>
	<v lang=de>Er hat Fleisch angenommen durch den Hl. Geist</v>
	<v lang=la>ex <i><sup>⚬</sup></i> María Vírgine:</v>
	<v lang=de>aus <i><sup>⚬</sup></i> Maria, der Jungfrau</v>
	<v lang=la>Et homo factus est.</v>
	<v lang=de>und ist Mensch geworden.</v>
	<v lang=la>Crucifíxus étiam pro nobis:</v>
	<v lang=de>Gekreuzigt wurde Er sogar für uns;</v>
	<v lang=la>sub Póntio Piláto passus, et sepúltus est.</v>
	<v lang=de>unter Pontius Pilatus hat Er den Tod erlitten</v>
	<v lang=de>und ist begraben worden</v>
	</p>
	<p>
	<v lang=la>Et resurréxit tértia die,</v>
	<v lang=de>Er ist auferstanden am dritten Tage,</v>
	<v lang=la>secúndum Scriptúras.</v>
	<v lang=de>gemäß der Schrift;</v>
	<v lang=la>Et ascéndit in cáelum:</v>
	<v lang=de>Er ist aufgefahren in den Himmel</v>
	<v lang=la>sedet ad déxteram Patris.</v>
	<v lang=de>und sitzet zur Rechten des Vaters.</v>
	</p>
	<p>
	<v lang=la>Et íterum ventúrus est cum glória</v>
	<v lang=de>Er wird wiederkommen in Herrlichkeit,</v>
	<v lang=la>judicáre vivos et mórtuos:</v>
	<v lang=de>Gericht zu halten über Lebende und Tote:</v>
	<v lang=la>cujus regni non erit finis.</v>
	<v lang=de>und Seines Reiches wird kein Endes sein.</v>
	</p>
	<p>
	<v lang=la>Et in Spíritum Sanctum,</v>
	<v lang=de>Ich glaube an den Heiligen Geist,</v>
	<v lang=la>Dóminum et vivificántem:</v>
	<v lang=de>den Herrn und Lebensspender,</v>
	<v lang=la>qui ex Patre Filióque procédit.</v>
	<v lang=de>der vom Vater und vom Sohne ausgeht.</v>
	<v lang=la>Qui cum Patre et Fílio simul <i><sup></sup></i> adorátur et conglorificátur:</v>
	<v lang=de>zugleich <i><sup></sup></i> angebetet und verherrlicht;</v>
	<v lang=la>qui locútus est per Prophétas.</v>
	<v lang=de>Er hat gesprochen durch die Propheten.</v>
	<v lang=la>Et unam sanctam cathólicam et apostólicam Ecclésiam.</v>
	<v lang=de>Ich glaube an die eine, heilige, katholische und apostolische Kirche.</v>
	<v lang=la>Confíteor unum baptísma</v>
	<v lang=de>Ich bekenne die eine Taufe</v>
	<v lang=la>in remissiónem peccatórum.</v>
	<v lang=de>zur Vergebung der Sünden.</v>
	<v lang=la>Et exspécto resurrectiónem mortuórum.</v>
	<v lang=de>Ich erwarte die Auferstehung der Toten.</v>
	<v lang=la><i>♱</i> Et vitam ventúri sǽculi. Amen.</v>
	<v lang=de><i>♱</i> Und das Leben der zukünftigen Welt. Amen.</v>
	</p>
</Gebet>

<Gebet name={"Ave Maria"} is_bilingue={true}>
	<p>
	<v lang=la>Ave María, grátia plena. Dóminus tecum,</v>
	<v lang=de>Gegrüsset seist du Maria, voll der Gnade; der Herr ist mit dir;</v>
	<v lang=la>benedícta tu in muliéribus,</v>
	<v lang=de>du bist gebenedeit unter den Weibern,</v>
	<v lang=la>et benedíctus fructus ventris tui, Jesus.</v>
	<v lang=de>und gebenedeit ist die Frucht deines Leibes, Jesus.</v>
	</p>
	<p>
	<v lang=la>Sancta María, mater Dei, ora pro nobis peccatóribus,</v>
	<v lang=de>Heilige Maria, Mutter Gottes, bitte für uns Sünder</v>
	<v lang=la>nunc, et in hora mortis nostræ. Amen.</v>
	<v lang=de>jetzt und in der Stunde unseres Todes! Amen.</v>
	</p>
</Gebet>

<Gebet name={"Salve Regina"} is_bilingue={true}>
	<p>
	<v lang=la>Salve, Regína,</v>
	<v lang=de>Sei gegrüßt, o Königin,</v>
	<v lang=la>máter misericórdiae;</v>
	<v lang=de>Mutter der Barmherzigkeit,</v>
	<v lang=la>Víta, dulcédo et spes nóstra, sálve.</v>
	<v lang=de>unser Leben, unsre Wonne</v>
	<v lang=de>und unsere Hoffnung, sei gegrüßt!</v>
	</p>
	<p>
	<v lang=la>Ad te clamámus, éxsules fílii Hévae.</v>
	<v lang=de>Zu dir rufen wir verbannte Kinder Evas;</v>
	<v lang=la>Ad te suspirámus,</v>
	<v lang=de>zu dir seufzen wir</v>
	<v lang=la>geméntes et fléntes in hac lacrimárum válle.</v>
	<v lang=de>trauernd und weinend in diesem Tal der Tränen.</v>
	<v lang=la>Eia ergo, Advocáta nóstra,</v>
	<v lang=de>Wohlan denn, unsre Fürsprecherin,</v>
	<v lang=la>íllos túos misericórdes óculos ad nos convérte.</v>
	<v lang=de>deine barmherzigen Augen wende zu uns</v>
	<v lang=la>Et Jésum, benedíctum frúctum véntris túi,</v>
	<v lang=de>und nach diesem Elend zeige uns Jesus,</v>
	<v lang=la>nóbis post hoc exsílíum osténde.</v>
	<v lang=de>die gebenedeite Frucht deines Leibes.</v>
	<v lang=la>O clémens, o pía, o dúlcis Vírgo María.</v>
	<v lang=de>O gütige, o milde, o süße Jungfrau Maria.</v>
	</p>
</Gebet>

<Gebet name={"Das Fatimagebet"} is_bilingue={true}>
	<v lang=la>Ó mí Jésú, dímitte nóbís débita nostra,</v>
	<v lang=de>O mein Jesus, verzeih' uns unsere Sünden,</v>
	<v lang=la>líberá nós ab igne ínferní,</v>
	<v lang=de>bewahre uns vor den Feuern der Hölle</v>
	<v lang=la>condúc in cælum omnés animás, </v>
	<v lang=de>und führe alle Seelen in den Himmel,</v>
	<v lang=la>præsertim illás,</v>
	<v lang=de>besonders jene,</v>
	<v lang=la>quæ maximé indigent misericordiá tuá. Amen.</v>
	<v lang=de>die Deiner Barmherzigkeit am meisten bedürfen. Amen.</v>
</Gebet>

<Gebet name={"Glória"} is_bilingue={true}>
<p slot="intro">Der uralte Gesang beginnt mit den Worten, mit denen die Engelscharen den neugeborenen Welterlöser feierten. Er preist zunächst Gott Vater, dann Gott Sohn; er schließt mit einer Huldigung an die Heiligste Dreifaltigkeit, wobei man sich mit dem großen Kreuze bezeichnet.</p>
	<p>
	<v lang=la>Glória in excélsis <i><sup>⚬</sup></i> Deo.</v>
	<v lang=de>Ehre sei <i><sup>⚬</sup></i> Gott in der Höhe.</v>
	<v lang=la>Et in terra pax homínibus</v>
	<v lang=de>Und auf Erden Friede den Mesnchen,</v>
	<v lang=la>bonæ voluntátis.</v>
	<v lang=de>die guten Willens sind.</v>
	<v lang=la>Laudámus te.</v>
	<v lang=de>Wir loben Dich.</v>
	<v lang=la>Benedícimus te.</v>
	<v lang=de>Wir preisen Dich.</v>
	<v lang=la><i><sup>⚬</sup></i> Adorámus te.</v>
	<v lang=de><i><sup>⚬</sup></i> Wir beten Dich an.</v>
	<v lang=la>Glorificámus te.</v>
	<v lang=de>Wir verherrlichen Dich.</v>
	<v lang=la><i><sup>⚬</sup></i> Grátias ágimus tibi</v>
	<v lang=de><i><sup>⚬</sup></i> Wir sagen Dir Dank</v>
	<v lang=la>propter magnam glóriam tuam.</v>
	<v lang=de>ob Deiner großen Herrlichkeit.</v>
	<v lang=la>Dómine Deus, Rex cæléstis,</v>
	<v lang=de>Herr und Gott, König des Himmels,</v>
	<v lang=la>Deus Pater omnípotens.</v>
	<v lang=de>Gott allmächtiger Vater!</v>
	<v lang=la>Dómine Fili unigénite, <i><sup>⚬</sup></i> Jesu Christe.</v>
	<v lang=de>Herr <i><sup>⚬</sup></i> Jesus Christus, eingeborener Sohn!</v>
	<v lang=la>Dómine Deus, Agnus Dei,</v>
	<v lang=de>Herr und Gott, Lamm Gottes,</v>
	<v lang=la>Fílius Patris.</v>
	<v lang=de>Sohn des Vaters!</v>
	<v lang=la>Qui tollis peccáta mundi,</v>
	<v lang=de>Du nimmst hinweg die Sünden der Welt:</v>
	<v lang=la>miserére nobis.</v>
	<v lang=de>erbarme Dich unser.</v>
	<v lang=la>Qui tollis peccáta mundi,</v>
	<v lang=de>Du nimmst hinwerg die Sünden der Welt.</v>
	<v lang=la><i><sup>⚬</sup></i> súscipe depreciatiónem nostram.</v>
	<v lang=de><i><sup>⚬</sup></i> nimm unser Flehen gnädig auf.</v>
	<v lang=la>Qui sedes ad déxteram Patris,</v>
	<v lang=de>Du sitzt zur Rechten des Vaters:</v>
	<v lang=la>miserére nobis.</v>
	<v lang=de>erbarme Dich unser.</v>
	<v lang=la>Quóniam tu solus Sanctus.</v>
	<v lang=de>Denn Du allein bist der Heilige.</v>
	<v lang=la>Tu solus Altíssimus,</v>
	<v lang=de>Du allein der Höchste,</v>
	<v lang=la><i><sup>⚬</sup></i> Jesu Christe.</v>
	<v lang=de><i><sup>⚬</sup></i> Jesus Christus,</v>
	<v lang=la>Cum Sancto Spíritu</v>
	<v lang=de>Mit dem Hl. Geiste,</v>
	<v lang=la><i>♱</i> in glória Dei Patris. Amen.</v>
	<v lang=de><i>♱</i> in der Herrlichkeit Gottes des Vaters. Amen.</v>
	</p>
</Gebet>

<Gebet name={"Gebet zum hl. Erzengel Michael"} is_bilingue={true}>
     <p>
	<v lang=la>Sáncte Míchael Archángele,</v>
	<v lang=de>Heiliger Erzengel Michael,</v>
	<v lang=la>defénde nos in proélio,</v>
	<v lang=de>verteidige uns im Kampfe!</v>
	<v lang=la>cóntra nequítam et insídias</v>
	<v lang=de>Gegen die Bosheit und Nachstellungen</v>
	<v lang=la>diáboli ésto præsídium.</v>
	<v lang=de>des Teufels sei unser Schutz. </v>
	<v lang=la>Ímperet ílli Déus, súpplices deprecámur:</v>
	<v lang=de>»Gott gebiete ihm!«, so bitten wir flehentlich.</v>
	<v lang=la>tuque, Prínceps milítæ cæléstis,</v>
	<v lang=de>Du aber, Fürst der himmlischen Heerscharen,</v>
	<v lang=la>Sátanam aliósque spíritus malígnos,</v>
	<v lang=de>stoße den Satan und die anderen bösen Geister,</v>
	<v lang=la>qui ad perditiónem animárum</v>
	<v lang=la>pervagántur in múndo,</v>
	<v lang=de>die in der Welt umhergehen,</v>
	<v lang=de>um die Seelen zu verderben,</v>
	<v lang=la>divína virtúte, in inférnum detrúde. Amen.</v>
	<v lang=de>durch die Kraft Gottes in die Hölle. Amen.</v>
     </p>
</Gebet>

<Gebet name={"Bruder Klaus Gebet"} is_bilingue={false}>
	<p>
	<v lang=de>Mein Herr und mein Gott,</v>
	<v lang=de>nimm alles von mir,</v>
	<v lang=de>was mich hindert zu Dir.</v>
	</p>
	<p>
	<v lang=de>Mein Herr und mein Gott,</v>
	<v lang=de>gib alles mir,</v>
	<v lang=de>was mich führet zu Dir.</v>
	</p>
	<p>
	<v lang=de>Mein Herr und mein Gott,</v>
	<v lang=de>nimm mich mir</v>
	<v lang=de>und gib mich ganz zu eigen Dir.</v>
	</p>
</Gebet>

<Gebet name={"Josephgebet des hl. Papst Pius X"} is_bilingue={false}>
<p slot="intro">Wenn man mehr zum hl. Joseph als <q>Patrone Morientium</q> wissen möchte kann man <a href="predigten/20220319-hl._joseph">hier</a> die Predigt zum Festtag des hl. Joseph nachlesen.</p>

		<p>
		<v>Jungfräulicher Vater Jesu,</v>
		<v>Reinster Bräutigam Mariä,</v>
		<v>Sankt Joseph, bitte Tag für Tag bei Jesus, dem Sohn Gottes.</v>
		<v>Seine Kraft und Gnade soll uns stärken,</v>
		<v>dass wir siegreich streiten im Leben</v>
		<v>und die Krone von Ihm erhalten im Sterben.</v>
		</p>
</Gebet>
</div>
</div>
