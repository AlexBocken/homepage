/**
 * A glossary of the Catechism, keyed to the paragraphs that explain each term.
 *
 * No free edition carries the analytical index or the glossary of the printed
 * book, so this one is written here. It is deliberately not a dictionary: an
 * entry holds no definition of its own, only the paragraphs where the
 * Catechism says what the thing is. That keeps the glossary honest — the words
 * a reader gets are the Catechism's — and it makes it work in all three
 * languages at once, because a paragraph number means the same everywhere.
 *
 * The importer checks every entry: the paragraphs must exist, and the first of
 * them must actually mention the term, so a wrong number shows up as a warning
 * rather than as a link to something else. `stem` narrows that check where the
 * German label and the word in the text differ in their ending.
 */

export type GlossaryEntry = {
	/** German · English · Latin, in that order. */
	de: string;
	en: string;
	la: string;
	/** The paragraphs that say what it is, best first. */
	defines: number[];
	/** What the check looks for in the text, when the label itself will not do. */
	stem?: string;
	/** Related entries, by German label. */
	see?: string[];
};

export const GLOSSARY: GlossaryEntry[] = [
	// ---- revelation, faith, Scripture ----
	{ de: 'Offenbarung', en: 'Revelation', la: 'Revelatio', defines: [50, 51, 68], see: ['Heilige Schrift', 'Überlieferung'] },
	{ de: 'Überlieferung', en: 'Tradition', la: 'Traditio', defines: [78, 81, 96], stem: 'berlieferung', see: ['Offenbarung', 'Lehramt'] },
	{ de: 'Heilige Schrift', en: 'Sacred Scripture', la: 'Sacra Scriptura', defines: [104, 105, 108], stem: 'Schrift', see: ['Inspiration', 'Kanon'] },
	{ de: 'Inspiration', en: 'Inspiration', la: 'Inspiratio', defines: [106, 107, 105], stem: 'inspirier' },
	{ de: 'Kanon', en: 'Canon of Scripture', la: 'Canon Scripturae', defines: [120, 138] },
	{ de: 'Lehramt', en: 'Magisterium', la: 'Magisterium', defines: [85, 88, 890] },
	{ de: 'Dogma', en: 'Dogma', la: 'Dogma', defines: [88, 89, 90], stem: 'Dogm' },
	{ de: 'Glaube', en: 'Faith', la: 'Fides', defines: [150, 153, 176, 1814] },
	{ de: 'Glaubensbekenntnis', en: 'Creed', la: 'Symbolum fidei', defines: [187, 188, 186], stem: 'Glaubensbekenntnis' },
	{ de: 'Evangelium', en: 'Gospel', la: 'Evangelium', defines: [125, 514, 1846], stem: 'Evangeli' },
	{ de: 'Katechese', en: 'Catechesis', la: 'Catechesis', defines: [4, 5, 426] },

	// ---- God, creation, the fall ----
	{ de: 'Dreifaltigkeit', en: 'Trinity', la: 'Trinitas', defines: [253, 254, 255, 261] },
	{ de: 'Schöpfung', en: 'Creation', la: 'Creatio', defines: [289, 290, 338], stem: 'chöpf' },
	{ de: 'Vorsehung', en: 'Divine providence', la: 'Providentia divina', defines: [302, 303, 321] },
	{ de: 'Engel', en: 'Angels', la: 'Angeli', defines: [328, 329, 330] },
	{ de: 'Schutzengel', en: 'Guardian angel', la: 'Angelus custos', defines: [336, 352], stem: 'Engel' },
	{ de: 'Seele', en: 'Soul', la: 'Anima', defines: [363, 365, 366] },
	{ de: 'Teufel', en: 'The devil', la: 'Diabolus', defines: [391, 392, 395], stem: 'Teufel' },
	{ de: 'Erbsünde', en: 'Original sin', la: 'Peccatum originale', defines: [404, 405, 417], stem: 'Erbs' },
	{ de: 'Konkupiszenz', en: 'Concupiscence', la: 'Concupiscentia', defines: [405, 1264, 2515] },

	// ---- Christ ----
	{ de: 'Menschwerdung', en: 'Incarnation', la: 'Incarnatio', defines: [461, 463, 483] },
	{ de: 'Reich Gottes', en: 'Kingdom of God', la: 'Regnum Dei', defines: [541, 543, 567], stem: 'Reich' },
	{ de: 'Erlösung', en: 'Redemption', la: 'Redemptio', defines: [517, 601, 613], stem: 'rl' },
	{ de: 'Auferstehung Christi', en: 'Resurrection of Christ', la: 'Resurrectio Christi', defines: [638, 648, 656], stem: 'Auferstehung' },
	{ de: 'Himmelfahrt', en: 'Ascension', la: 'Ascensio', defines: [659, 665, 668], stem: 'Himmel' },
	{ de: 'Pfingsten', en: 'Pentecost', la: 'Pentecostes', defines: [731, 732, 767], stem: 'Pfingst' },

	// ---- the Church ----
	{ de: 'Kirche', en: 'Church', la: 'Ecclesia', defines: [751, 752, 777, 781] },
	{ de: 'Volk Gottes', en: 'People of God', la: 'Populus Dei', defines: [781, 782, 802], stem: 'Volk' },
	{ de: 'Leib Christi', en: 'Body of Christ', la: 'Corpus Christi', defines: [787, 789, 805], stem: 'Leib' },
	{ de: 'Charisma', en: 'Charism', la: 'Charisma', defines: [799, 800, 801, 2003], stem: 'Charism' },
	{ de: 'Ökumene', en: 'Ecumenism', la: 'Oecumenismus', defines: [820, 821, 855], stem: 'Einheit' },
	{ de: 'Mission', en: 'Mission', la: 'Missio', defines: [849, 851, 868] },
	{ de: 'Papst', en: 'Pope', la: 'Romanus Pontifex', defines: [881, 882, 936], stem: 'Papst' },
	{ de: 'Bischofskollegium', en: 'College of bishops', la: 'Collegium episcoporum', defines: [880, 883, 886], stem: 'Kollegium' },
	{ de: 'Unfehlbarkeit', en: 'Infallibility', la: 'Infallibilitas', defines: [890, 891, 2035] },
	{ de: 'Bischof', en: 'Bishop', la: 'Episcopus', defines: [1557, 1558, 1594] },
	{ de: 'Priester', en: 'Priest', la: 'Presbyter', defines: [1562, 1564, 1595] },
	{ de: 'Diakon', en: 'Deacon', la: 'Diaconus', defines: [1569, 1570, 1596] },
	{ de: 'Laien', en: 'The lay faithful', la: 'Christifideles laici', defines: [897, 898, 900, 940] },
	{ de: 'Gottgeweihtes Leben', en: 'Consecrated life', la: 'Vita consecrata', defines: [914, 916, 925, 944], stem: 'evangelischen Räte' },
	{ de: 'Gemeinschaft der Heiligen', en: 'Communion of saints', la: 'Communio sanctorum', defines: [946, 948, 960], stem: 'Gemeinschaft der Heiligen' },
	{ de: 'Heiligenverehrung', en: 'Veneration of the saints', la: 'Cultus sanctorum', defines: [957, 1173, 2683], stem: 'Heiligen' },
	{ de: 'Maria', en: 'Mary', la: 'Maria', defines: [963, 967, 971] },
	{ de: 'Unbefleckte Empfängnis', en: 'Immaculate Conception', la: 'Immaculata Conceptio', defines: [491, 490, 508], stem: 'Unbefleckt' },
	{ de: 'Aufnahme Mariens in den Himmel', en: 'Assumption of Mary', la: 'Assumptio Mariae', defines: [966, 974], stem: 'Aufnahme' },
	{ de: 'Rosenkranz', en: 'Rosary', la: 'Rosarium', defines: [971, 2678, 2708] },

	// ---- the last things ----
	{ de: 'Tod', en: 'Death', la: 'Mors', defines: [1005, 1007, 1013, 1016], stem: 'Tod' },
	{ de: 'Besonderes Gericht', en: 'Particular judgement', la: 'Iudicium particulare', defines: [1021, 1022, 1051], stem: 'Gericht' },
	{ de: 'Himmel', en: 'Heaven', la: 'Caelum', defines: [1024, 1023, 1026, 1053], stem: 'Himmel' },
	{ de: 'Läuterung', en: 'Purgatory', la: 'Purgatorium', defines: [1030, 1031, 1054], stem: 'uterung' },
	{ de: 'Hölle', en: 'Hell', la: 'Infernus', defines: [1033, 1035, 1056, 1057], stem: 'lle' },
	{ de: 'Letztes Gericht', en: 'Last judgement', la: 'Iudicium ultimum', defines: [1038, 1039, 1059], stem: 'Gericht' },
	{ de: 'Auferstehung des Fleisches', en: 'Resurrection of the body', la: 'Carnis resurrectio', defines: [990, 997, 1015], stem: 'Auferstehung' },
	{ de: 'Ewiges Leben', en: 'Eternal life', la: 'Vita aeterna', defines: [1020, 1025], stem: 'ewige' },

	// ---- liturgy and the sacraments ----
	{ de: 'Liturgie', en: 'Liturgy', la: 'Liturgia', defines: [1069, 1070, 1187] },
	{ de: 'Epiklese', en: 'Epiclesis', la: 'Epiclesis', defines: [1105, 1106, 1109] },
	{ de: 'Sakrament', en: 'Sacrament', la: 'Sacramentum', defines: [1113, 1127, 1131] },
	{ de: 'Prägemal', en: 'Sacramental character', la: 'Character sacramentalis', defines: [1121, 1272, 1304], stem: 'Siegel' },
	{ de: 'Bilderverehrung', en: 'Veneration of images', la: 'Cultus imaginum', defines: [1159, 1161, 2131, 2132], stem: 'Bilder' },
	{ de: 'Kirchenjahr', en: 'Liturgical year', la: 'Annus liturgicus', defines: [1163, 1168, 1194], stem: 'Jahr' },
	{ de: 'Sonntag', en: 'Sunday', la: 'Dies dominica', defines: [1167, 1166, 2174, 2177], stem: 'Sonntag' },
	{ de: 'Stundengebet', en: 'Liturgy of the Hours', la: 'Liturgia horarum', defines: [1174, 1175, 1178], stem: 'Stundengebet' },
	{ de: 'Taufe', en: 'Baptism', la: 'Baptismus', defines: [1213, 1257, 1277] },
	{ de: 'Firmung', en: 'Confirmation', la: 'Confirmatio', defines: [1285, 1316, 1317] },
	{ de: 'Eucharistie', en: 'Eucharist', la: 'Eucharistia', defines: [1322, 1324, 1373, 1413] },
	{ de: 'Messopfer', en: 'Sacrifice of the Mass', la: 'Sacrificium Missae', defines: [1366, 1367, 1382], stem: 'Opfer' },
	{ de: 'Wandlung', en: 'Transubstantiation', la: 'Transsubstantiatio', defines: [1376, 1413], stem: 'Wandlung' },
	{ de: 'Kommunion', en: 'Holy Communion', la: 'Communio', defines: [1391, 1384, 1416], stem: 'Kommunion' },
	{ de: 'Busse', en: 'Penance and Reconciliation', la: 'Paenitentia', defines: [1422, 1440, 1486], stem: 'Bu' },
	{ de: 'Umkehr', en: 'Conversion', la: 'Conversio', defines: [1427, 1428, 1431, 1490] },
	{ de: 'Reue', en: 'Contrition', la: 'Contritio', defines: [1451, 1452, 1453] },
	{ de: 'Beichtgeheimnis', en: 'Seal of confession', la: 'Sigillum sacramentale', defines: [1467, 2490, 2511], stem: 'Geheimnis' },
	{ de: 'Ablass', en: 'Indulgence', la: 'Indulgentia', defines: [1471, 1478, 1498], stem: 'Abläss' },
	{ de: 'Krankensalbung', en: 'Anointing of the sick', la: 'Unctio infirmorum', defines: [1499, 1520, 1532] },
	{ de: 'Weihesakrament', en: 'Holy Orders', la: 'Sacramentum Ordinis', defines: [1536, 1554, 1591], stem: 'Weihe' },
	{ de: 'Ehe', en: 'Matrimony', la: 'Matrimonium', defines: [1601, 1638, 1660], stem: 'Ehe' },
	{ de: 'Sakramentalien', en: 'Sacramentals', la: 'Sacramentalia', defines: [1667, 1670, 1677] },

	// ---- the moral life ----
	{ de: 'Seligpreisungen', en: 'The Beatitudes', la: 'Beatitudines', defines: [1716, 1717, 1725, 1726] },
	{ de: 'Freiheit', en: 'Freedom', la: 'Libertas', defines: [1731, 1733, 1744] },
	{ de: 'Gewissen', en: 'Conscience', la: 'Conscientia', defines: [1778, 1795, 1796, 1800] },
	{ de: 'Tugend', en: 'Virtue', la: 'Virtus', defines: [1803, 1833] },
	{ de: 'Kardinaltugenden', en: 'Cardinal virtues', la: 'Virtutes cardinales', defines: [1805, 1834], stem: 'Kardinal' },
	{ de: 'Klugheit', en: 'Prudence', la: 'Prudentia', defines: [1806, 1835] },
	{ de: 'Gerechtigkeit', en: 'Justice', la: 'Iustitia', defines: [1807, 1836] },
	{ de: 'Tapferkeit', en: 'Fortitude', la: 'Fortitudo', defines: [1808, 1837] },
	{ de: 'Mass', en: 'Temperance', la: 'Temperantia', defines: [1809, 1838], stem: 'Mäßigung' }, // ß-ok: the word as the 1997 text spells it
	{ de: 'Göttliche Tugenden', en: 'Theological virtues', la: 'Virtutes theologales', defines: [1812, 1813, 1840], stem: 'ttliche' },
	{ de: 'Hoffnung', en: 'Hope', la: 'Spes', defines: [1817, 1843] },
	{ de: 'Liebe', en: 'Charity', la: 'Caritas', defines: [1822, 1825, 1844] },
	{ de: 'Gaben des Heiligen Geistes', en: 'Gifts of the Holy Spirit', la: 'Dona Spiritus Sancti', defines: [1830, 1831, 1845], stem: 'Gaben' },
	{ de: 'Sünde', en: 'Sin', la: 'Peccatum', defines: [1849, 1850, 1871], stem: 'nde' },
	{ de: 'Todsünde', en: 'Mortal sin', la: 'Peccatum mortale', defines: [1855, 1857, 1874], stem: 'Tods' },
	{ de: 'Lässliche Sünde', en: 'Venial sin', la: 'Peccatum veniale', defines: [1862, 1855, 1875], stem: 'läßliche' }, // ß-ok: the word as the 1997 text spells it
	{ de: 'Hauptsünden', en: 'Capital sins', la: 'Vitia capitalia', defines: [1866], stem: 'Hauptsünden' },
	{ de: 'Subsidiarität', en: 'Subsidiarity', la: 'Subsidiarietas', defines: [1883, 1885, 1894], stem: 'Subsidiarit' },
	{ de: 'Gemeinwohl', en: 'Common good', la: 'Bonum commune', defines: [1906, 1907, 1924, 1925] },
	{ de: 'Soziale Gerechtigkeit', en: 'Social justice', la: 'Iustitia socialis', defines: [1928, 1929, 1943], stem: 'ozial' },
	{ de: 'Solidarität', en: 'Solidarity', la: 'Solidarietas', defines: [1939, 1941, 1948], stem: 'Solidarit' },
	{ de: 'Sittengesetz', en: 'Moral law', la: 'Lex moralis', defines: [1950, 1952, 1975], stem: 'Gesetz' },
	{ de: 'Natürliches Sittengesetz', en: 'Natural moral law', la: 'Lex naturalis', defines: [1954, 1955, 1978, 1979], stem: 'rliche' },
	{ de: 'Altes Gesetz', en: 'The Old Law', la: 'Lex vetus', defines: [1962, 1961, 1980], stem: 'Gesetz' },
	{ de: 'Neues Gesetz', en: 'The New Law', la: 'Lex nova', defines: [1965, 1966, 1983, 1985], stem: 'neue Gesetz' },
	{ de: 'Rechtfertigung', en: 'Justification', la: 'Iustificatio', defines: [1987, 1989, 1992], stem: 'echtfertig' },
	{ de: 'Gnade', en: 'Grace', la: 'Gratia', defines: [1996, 1997, 2021, 2023] },
	{ de: 'Verdienst', en: 'Merit', la: 'Meritum', defines: [2006, 2008, 2025] },
	{ de: 'Heiligkeit', en: 'Holiness', la: 'Sanctitas', defines: [2013, 2014, 2028] },
	{ de: 'Kirchengebote', en: 'Precepts of the Church', la: 'Praecepta Ecclesiae', defines: [2041, 2042, 2043], stem: 'Gebote der Kirche' },

	// ---- the commandments ----
	{ de: 'Dekalog', en: 'The Decalogue', la: 'Decalogus', defines: [2056, 2058, 2067] },
	{ de: 'Anbetung', en: 'Adoration', la: 'Adoratio', defines: [2096, 2097, 2135] },
	{ de: 'Religionsfreiheit', en: 'Religious freedom', la: 'Libertas religiosa', defines: [2106, 2108, 2137], stem: 'Religionsfreiheit' },
	{ de: 'Aberglaube', en: 'Superstition', la: 'Superstitio', defines: [2110, 2111, 2138] },
	{ de: 'Götzendienst', en: 'Idolatry', la: 'Idololatria', defines: [2113, 2112, 2114], stem: 'Götzendienst' },
	{ de: 'Wahrsagerei', en: 'Divination', la: 'Divinatio', defines: [2116, 2115, 2117], stem: 'Wahrsager' },
	{ de: 'Name Gottes', en: 'The name of God', la: 'Nomen Dei', defines: [2143, 2144, 2160], stem: 'Name' },
	{ de: 'Gotteslästerung', en: 'Blasphemy', la: 'Blasphemia', defines: [2148, 2162], stem: 'sterung' },
	{ de: 'Eid', en: 'Oath', la: 'Iusiurandum', defines: [2150, 2154, 2163], stem: 'Eid' },
	{ de: 'Meineid', en: 'Perjury', la: 'Periurium', defines: [2152, 2163], stem: 'Eid' },
	{ de: 'Notwehr', en: 'Legitimate defence', la: 'Legitima defensio', defines: [2263, 2264, 2321], stem: 'Notwehr' },
	{ de: 'Todesstrafe', en: 'The death penalty', la: 'Poena mortis', defines: [2267] },
	{ de: 'Abtreibung', en: 'Abortion', la: 'Abortus', defines: [2271, 2270, 2322], stem: 'Abtreibung' },
	{ de: 'Euthanasie', en: 'Euthanasia', la: 'Euthanasia', defines: [2277, 2324] },
	{ de: 'Ärgernis', en: 'Scandal', la: 'Scandalum', defines: [2284, 2326], stem: 'rgernis' },
	{ de: 'Krieg', en: 'War', la: 'Bellum', defines: [2307, 2308, 2309] },
	{ de: 'Keuschheit', en: 'Chastity', la: 'Castitas', defines: [2337, 2345, 2394] },
	{ de: 'Ehebruch', en: 'Adultery', la: 'Adulterium', defines: [2380, 2400] },
	{ de: 'Ehescheidung', en: 'Divorce', la: 'Divortium', defines: [2384, 2382, 2400], stem: 'Scheidung' },
	{ de: 'Eigentum', en: 'Private property', la: 'Dominium privatum', defines: [2403, 2402, 2404], stem: 'Eigentum' },
	{ de: 'Diebstahl', en: 'Theft', la: 'Furtum', defines: [2408, 2453] },
	{ de: 'Arbeit', en: 'Work', la: 'Labor', defines: [2427, 2428, 2460] },
	{ de: 'Werke der Barmherzigkeit', en: 'Works of mercy', la: 'Opera misericordiae', defines: [2447], stem: 'Barmherzigkeit' },
	{ de: 'Wahrheit', en: 'Truth', la: 'Veritas', defines: [2465, 2468, 2505] },
	{ de: 'Üble Nachrede', en: 'Detraction', la: 'Detractio', defines: [2477, 2479, 2507], stem: 'Nachrede' },
	{ de: 'Lüge', en: 'Lying', la: 'Mendacium', defines: [2482, 2483, 2508], stem: 'ge' },
	{ de: 'Begierde', en: 'Concupiscence of the eyes', la: 'Concupiscentia', defines: [2514, 2515, 2528, 2529], stem: 'Begierde' },
	{ de: 'Neid', en: 'Envy', la: 'Invidia', defines: [2539, 2553, 2554] },
	{ de: 'Armut im Geiste', en: 'Poverty of heart', la: 'Paupertas cordis', defines: [2546, 2544, 2556], stem: 'Geiste' },

	// ---- prayer ----
	{ de: 'Gebet', en: 'Prayer', la: 'Oratio', defines: [2559, 2590, 2697] },
	{ de: 'Mündliches Gebet', en: 'Vocal prayer', la: 'Oratio vocalis', defines: [2701, 2700, 2722], stem: 'mündlich' },
	{ de: 'Betrachtendes Gebet', en: 'Meditation', la: 'Meditatio', defines: [2705, 2708, 2723], stem: 'betrachtende' },
	{ de: 'Inneres Gebet', en: 'Contemplative prayer', la: 'Oratio contemplativa', defines: [2709, 2713, 2724], stem: 'innere Gebet' },
	{ de: 'Vaterunser', en: 'The Lord’s Prayer', la: 'Oratio dominica', defines: [2773, 2761, 2759], stem: 'Vaterunser' },
	{ de: 'Vergebung', en: 'Forgiveness', la: 'Remissio', defines: [976, 979, 982, 2840] },
	{ de: 'Versuchung', en: 'Temptation', la: 'Tentatio', defines: [2846, 2847, 2863] }
];
