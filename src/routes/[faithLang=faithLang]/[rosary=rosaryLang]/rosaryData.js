// Mystery variations for each type of rosary
export const mysteries = {
	freudenreich: [
		"Jesus, den du, o Jungfrau, vom Heiligen Geist empfangen hast.",
		"Jesus, den du, o Jungfrau, zu Elisabeth getragen hast.",
		"Jesus, den du, o Jungfrau, in Betlehem geboren hast.",
		"Jesus, den du, o Jungfrau, im Tempel geopfert hast.",
		"Jesus, den du, o Jungfrau, im Tempel wiedergefunden hast."
	],
	schmerzhaften: [
		"Jesus, der für uns Blut geschwitzt hat.",
		"Jesus, der für uns gegeisselt worden ist.",
		"Jesus, der für uns mit Dornen gekrönt worden ist.",
		"Jesus, der für uns das schwere Kreuz getragen hat.",
		"Jesus, der für uns gekreuzigt worden ist."
	],
	glorreichen: [
		"Jesus, der von den Toten auferstanden ist.",
		"Jesus, der in den Himmel aufgefahren ist.",
		"Jesus, der uns den Heiligen Geist gesandt hat.",
		"Jesus, der dich, o Jungfrau, in den Himmel aufgenommen hat.",
		"Jesus, der dich, o Jungfrau, im Himmel gekrönt hat."
	],
	lichtreichen: [
		"Jesus, der von Johannes getauft worden ist.",
		"Jesus, der sich bei der Hochzeit in Kana geoffenbart hat.",
		"Jesus, der uns das Reich Gottes verkündet hat.",
		"Jesus, der auf dem Berg verklärt worden ist.",
		"Jesus, der uns die Eucharistie geschenkt hat."
	]
};

export const mysteriesLatin = {
	freudenreich: [
		"Jesus, quem, virgo, concepísti.",
		"Jesus, quem visitándo Elísabeth portásti.",
		"Jesus, quem, virgo, genuísti.",
		"Jesus, quem in templo præsentásti.",
		"Jesus, quem in templo invenisti."
	],
	schmerzhaften: [
		"Jesus, qui pro nobis sánguinem sudavit.",
		"Jesus, qui pro nobis flagellátus est.",
		"Jesus, qui pro nobis spinis coronátus est.",
		"Jesus, qui pro nobis crucem baiulávit.",
		"Jesus, qui pro nobis crucifixus est."
	],
	glorreichen: [
		"Jesus, qui resurréxit a mórtuis.",
		"Jesus, qui ascendit in cælum.",
		"Jesus, qui misit Spíritum Sanctum.",
		"Jesus, qui te, virgo, in cælum assúmpsit.",
		"Jesus, qui te, virgo, in cælo coronávit."
	],
	lichtreichen: [
		"Jesus, qui a Ioánne baptizátus est.",
		"Jesus, qui se in Cana revelávit.",
		"Jesus, qui regnum Dei prædicávit.",
		"Jesus, qui in monte transfigurátus est.",
		"Jesus, Sacraméntum Altáris instítuit."
	]
};

// English mysteries
export const mysteriesEnglish = {
	freudenreich: [
		"Jesus, whom thou, O Virgin, didst conceive of the Holy Spirit.",
		"Jesus, whom thou, O Virgin, didst carry to Elizabeth.",
		"Jesus, whom thou, O Virgin, didst bring forth in Bethlehem.",
		"Jesus, whom thou, O Virgin, didst present in the Temple.",
		"Jesus, whom thou, O Virgin, didst find in the Temple."
	],
	schmerzhaften: [
		"Jesus, who sweat blood for us.",
		"Jesus, who was scourged for us.",
		"Jesus, who was crowned with thorns for us.",
		"Jesus, who carried the heavy cross for us.",
		"Jesus, who was crucified for us."
	],
	glorreichen: [
		"Jesus, who rose from the dead.",
		"Jesus, who ascended into heaven.",
		"Jesus, who sent us the Holy Spirit.",
		"Jesus, who took thee, O Virgin, into heaven.",
		"Jesus, who crowned thee, O Virgin, in heaven."
	],
	lichtreichen: [
		"Jesus, who was baptized by John.",
		"Jesus, who revealed Himself at the wedding in Cana.",
		"Jesus, who proclaimed the Kingdom of God.",
		"Jesus, who was transfigured on the mountain.",
		"Jesus, who gave us the Eucharist."
	]
};

// Short titles for mysteries (for display in headings)
export const mysteryTitles = {
	freudenreich: [
		"Verkündigung",
		"Heimsuchung",
		"Geburt",
		"Darstellung",
		"Wiederfindung"
	],
	schmerzhaften: [
		"Todesangst",
		"Geisselung",
		"Dornenkrönung",
		"Kreuzweg",
		"Kreuzigung"
	],
	glorreichen: [
		"Auferstehung",
		"Himmelfahrt",
		"Geistsendung",
		"Aufnahme Mariens",
		"Krönung Mariens"
	],
	lichtreichen: [
		"Taufe",
		"Hochzeit zu Kana",
		"Verkündigung des Reiches",
		"Verklärung",
		"Einsetzung der Eucharistie"
	]
};

// English short titles for mysteries
export const mysteryTitlesEnglish = {
	freudenreich: [
		"Annunciation",
		"Visitation",
		"Nativity",
		"Presentation",
		"Finding in the Temple"
	],
	schmerzhaften: [
		"Agony in the Garden",
		"Scourging",
		"Crowning with Thorns",
		"Carrying of the Cross",
		"Crucifixion"
	],
	glorreichen: [
		"Resurrection",
		"Ascension",
		"Descent of the Holy Spirit",
		"Assumption of Mary",
		"Coronation of Mary"
	],
	lichtreichen: [
		"Baptism",
		"Wedding at Cana",
		"Proclamation of the Kingdom",
		"Transfiguration",
		"Institution of the Eucharist"
	]
};

// UI labels based on language
export function getLabels(isEnglish) {
	return {
		pageTitle: isEnglish ? 'Interactive Rosary' : 'Interaktiver Rosenkranz',
		pageDescription: isEnglish
			? 'Interactive digital version of the Rosary for praying along. Scroll through the prayers and follow the visualization.'
			: 'Interaktive digitale Version des Rosenkranzes zum Mitbeten. Scrolle durch die Gebete und folge der Visualisierung.',
		mysteries: isEnglish ? 'Mysteries' : 'Geheimnisse',
		today: isEnglish ? 'Today' : 'Heutige',
		joyful: isEnglish ? 'Joyful' : 'Freudenreiche',
		sorrowful: isEnglish ? 'Sorrowful' : 'Schmerzhaften',
		glorious: isEnglish ? 'Glorious' : 'Glorreichen',
		luminous: isEnglish ? 'Luminous' : 'Lichtreichen',
		includeLuminous: isEnglish ? 'Include Luminous Mysteries' : 'Lichtreiche Geheimnisse einbeziehen',
		showImages: isEnglish ? 'Show Images' : 'Bilder anzeigen',
		beginning: isEnglish ? 'Beginning' : 'Anfang',
		signOfCross: isEnglish ? '♱ Sign of the Cross' : '♱ Das Kreuzzeichen',
		ourFather: isEnglish ? 'Our Father' : 'Vater unser',
		hailMary: isEnglish ? 'Hail Mary' : 'Ave Maria',
		faith: isEnglish ? 'Faith' : 'Glaube',
		hope: isEnglish ? 'Hope' : 'Hoffnung',
		love: isEnglish ? 'Love' : 'Liebe',
		decade: isEnglish ? 'Decade' : 'Gesätz',
		optional: isEnglish ? 'optional' : 'optional',
		gloriaPatri: 'Gloria Patri',
		fatimaPrayer: isEnglish ? 'Fatima Prayer' : 'Das Fatima Gebet',
		conclusion: isEnglish ? 'Conclusion' : 'Abschluss',
		finalPrayer: isEnglish ? 'Final Prayer' : 'Schlussgebet',
		saintMichael: isEnglish ? 'Prayer to St. Michael the Archangel' : 'Gebet zum hl. Erzengel Michael',
		footnoteSign: isEnglish ? 'Make the Sign of the Cross here' : 'Hier das Kreuzzeichen machen',
		footnoteBow: isEnglish ? 'Bow the head here' : 'Hier den Kopf senken',
		showBibleVerse: isEnglish ? 'Show Bible verse' : 'Bibelstelle anzeigen',
		mysteryFaith: isEnglish ? 'Jesus, who may increase our faith' : 'Jesus, der in uns den Glauben vermehre',
		mysteryHope: isEnglish ? 'Jesus, who may strengthen our hope' : 'Jesus, der in uns die Hoffnung stärke',
		mysteryLove: isEnglish ? 'Jesus, who may kindle our love' : 'Jesus, der in uns die Liebe entzünde'
	};
}

// Get the appropriate mystery for a given weekday
export function getMysteryForWeekday(date, includeLuminous) {
	const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

	if (includeLuminous) {
		const schedule = {
			0: 'glorreichen',    // Sunday
			1: 'freudenreich',   // Monday
			2: 'schmerzhaften',  // Tuesday
			3: 'glorreichen',    // Wednesday
			4: 'lichtreichen',   // Thursday
			5: 'schmerzhaften',  // Friday
			6: 'freudenreich'    // Saturday
		};
		return schedule[dayOfWeek];
	} else {
		const schedule = {
			0: 'glorreichen',    // Sunday
			1: 'freudenreich',   // Monday
			2: 'schmerzhaften',  // Tuesday
			3: 'glorreichen',    // Wednesday
			4: 'freudenreich',   // Thursday
			5: 'schmerzhaften',  // Friday
			6: 'glorreichen'     // Saturday
		};
		return schedule[dayOfWeek];
	}
}

// SVG layout constants
export const BEAD_SPACING = 22;
export const DECADE_OFFSET = 10;

// Map sections to their vertical positions in the SVG
export const sectionPositions = {
	cross: 35,
	lbead1: 75,
	start1: 110,
	start2: 135,
	start3: 160,
	lbead2: 195,
	secret1: 270,
	secret2: 560,
	secret3: 840,
	secret4: 1120,
	secret5: 1400,
	final_transition: 1685,
	final_salve: 1720,
	final_schlussgebet: 1745,
	final_michael: 1770,
	final_paternoster: 1805,
	final_cross: 1900
};
// Center transition beads between last bead of decade d and first bead of decade d+1
for (let d = 1; d < 5; d++) {
	const lastBead = sectionPositions[`secret${d}`] + DECADE_OFFSET + 9 * BEAD_SPACING;
	const nextFirst = sectionPositions[`secret${d + 1}`] + DECADE_OFFSET;
	sectionPositions[`secret${d}_transition`] = Math.round((lastBead + nextFirst) / 2);
}

// Mystery images with captions (per mystery type, keyed by decade number 1-5)
export const allMysteryImages = {
	freudenreich: new Map([
		[1, { src: "/glaube/joyful/1-murilllo-annunciation.webp", artist: "Bartolomé Esteban Murillo", title: "The Annunciation", titleDe: "Die Verkündigung" }],
		[2, { src: "/glaube/joyful/2-carl-bloch.the-visitation.1866.webp", artist: "Carl Bloch", title: "The Visitation", titleDe: "Die Heimsuchung", year: 1866 }],
		[3, { src: "/glaube/joyful/3-adoration-of-the-shepards.webp", title: "Adoration of the Shepherds", titleDe: "Die Anbetung der Hirten" }],
		[4, { src: "/glaube/joyful/4-vouet.presentation-in-the-temple.webp", artist: "Simon Vouet", title: "The Presentation in the Temple", titleDe: "Die Darstellung im Tempel" }],
		[5, { src: "/glaube/joyful/5-carl-bloch.the-twelve-year-old-jesus-in-the-temple.1869.webp", artist: "Carl Bloch", title: "The Twelve-Year-Old Jesus in the Temple", titleDe: "Der zwölfjährige Jesus im Tempel", year: 1869 }],
	]),
	schmerzhaften: new Map([
		[1, { src: "/glaube/sorrowful/1.carl-bloch.gethsemane.webp", artist: "Carl Bloch", title: "Gethsemane", titleDe: "Gethsemane", year: 1873 }],
		[2, { src: "/glaube/sorrowful/2.wiliam-bouguereau.flagellation.webp", artist: "William-Adolphe Bouguereau", title: "The Flagellation of Our Lord Jesus Christ", titleDe: "Die Geisselung unseres Herrn Jesus Christus", year: 1880 }],
		[3, { src: "/glaube/sorrowful/3.carl-bloch.mocking.webp", artist: "Carl Bloch", title: "The Mocking of Christ", titleDe: "Die Verspottung Christi", year: 1880 }],
		[4, { src: "/glaube/sorrowful/4.lorenzo-lotto.carrying-the-cross.webp", artist: "Lorenzo Lotto", title: "Carrying the Cross", titleDe: "Die Kreuztragung", year: 1526 }],
		[5, { src: "/glaube/sorrowful/5.alonso-cano.the-crucifixion.webp", artist: "Diego Velázquez", title: "Christ Crucified", titleDe: "Der gekreuzigte Christus", year: 1632 }],
	]),
	glorreichen: new Map([
		[1, { src: "/glaube/glorious/1-carl-bloch.resurrection.webp", artist: "Carl Bloch", title: "The Resurrection", titleDe: "Die Auferstehung" }],
		[2, { src: "/glaube/glorious/2-ascension.webp", title: "The Ascension", titleDe: "Die Himmelfahrt" }],
		[3, { src: "/glaube/glorious/3-pentecost.webp", title: "Pentecost", titleDe: "Die Geistsendung" }],
		[4, { src: "/glaube/glorious/4-giovanni-tiepolo.the-immaculate-conception.webp", artist: "Giovanni Battista Tiepolo", title: "The Immaculate Conception", titleDe: "Die Aufnahme Mariens in den Himmel" }],
		[5, { src: "/glaube/glorious/5-diego-veazquez.coronation-mary.webp", artist: "Diego Velázquez", title: "Coronation of the Virgin", titleDe: "Die Krönung der Jungfrau", year: 1641 }],
	]),
	lichtreichen: new Map([
		[1, { src: "/glaube/luminous/1-carl-bloch.the-baptism-of-christ.1870.webp", artist: "Carl Bloch", title: "The Baptism of Christ", titleDe: "Die Taufe Christi", year: 1870 }],
		[2, { src: "/glaube/luminous/2-carl-bloch.the-wedding-at-cana.1870.webp", artist: "Carl Bloch", title: "The Wedding at Cana", titleDe: "Die Hochzeit zu Kana", year: 1870 }],
		[3, { src: "/glaube/luminous/3-carl-bloch.the-sermon-on-the-mount.1877.jpg", artist: "Carl Bloch", title: "The Sermon on the Mount", titleDe: "Die Bergpredigt", year: 1877 }],
		[4, { src: "/glaube/luminous/4-carl-bloch.transfiguration-of-christ.webp", artist: "Carl Bloch", title: "Transfiguration of Christ", titleDe: "Die Verklärung Christi" }],
		[5, { src: "/glaube/luminous/5-carl-bloch.the-last-supper.webp", artist: "Carl Bloch", title: "The Last Supper", titleDe: "Das letzte Abendmahl" }],
	]),
};
