// Tourplan 2026 — Trommlergruppe Weingarten (Kinderfest), Fr 10.–Di 14. Juli.
// Transcribed from "Tourplan 2026.pdf" (Sebastian Jäger).
//
// City sections in the PDF (grey header rows) set the town for the stops that
// follow; that town is baked into each stop's `city` here.
//
// `audience` says who attends: the "(E)" rows of the PDF are 'both', and the
// Ehemalige-only events (from their newsletter) are 'ehemaligen' — those sit in
// the timeline but never in the Aktive route or its travel legs.

export type StopKind = 'muster' | 'stop' | 'finale';

/**
 * Who is at a stop.
 *  - 'aktive'     the marching corps only (the default, and the printed plan)
 *  - 'both'       an "(E)" row: an Aktive station the Ehemaligen also attend
 *  - 'ehemaligen' an Ehemalige-only event — the Aktive never go there, so it
 *                 stays out of their route and out of the travel-leg chain
 */
export type Audience = 'aktive' | 'both' | 'ehemaligen';

export interface Stop {
	/** "HH:MM" in local (Europe/Berlin) time, or '' when the plan gives none. */
	time: string;
	name: string;
	/** Street + number or place name; omit when there is no routable address. */
	address?: string;
	/** Town the stop is in (drives the maps query + section grouping). */
	city: string;
	/** Green annotation from the plan, e.g. "Antreten", "Trommeln putzen". */
	note?: string;
	/** Defaults to 'aktive' when omitted. */
	audience?: Audience;
	kind: StopKind;
}

export const audienceOf = (s: Stop): Audience => s.audience ?? 'aktive';
/** On the Aktive march — drives their route, progress nodes and travel legs. */
export const attendsAktive = (s: Stop): boolean => audienceOf(s) !== 'ehemaligen';
/** On the Ehemaligen programme. */
export const attendsEhemaligen = (s: Stop): boolean => audienceOf(s) !== 'aktive';

export interface TourDay {
	/** ISO date, used to build absolute datetimes (July → CEST, +02:00). */
	date: string;
	label: string;
	stops: Stop[];
}

// Town → fully-qualified location for the Google-Maps query. Disambiguates the
// several "Weingarten"s and "Berg"s in Germany from the ones near Ravensburg.
export const CITY_FULL: Record<string, string> = {
	Weingarten: 'Weingarten (Württemberg)',
	Berg: 'Berg (Ravensburg)',
	Baienfurt: 'Baienfurt',
	Schlier: 'Schlier',
	Ravensburg: 'Ravensburg'
};

export const TOUR: TourDay[] = [
	{
		date: '2026-07-10',
		label: 'Freitag 10. Juli',
		stops: [
			{ time: '09:00', name: 'Ausgabe Tourshirts & Troco-Merch', address: 'Stadtgarten', city: 'Weingarten', audience: 'ehemaligen', kind: 'stop' },
			{ time: '13:30', name: 'Gymnasium Weingarten', city: 'Weingarten', note: 'Trommeln putzen', kind: 'muster' },
			{ time: '14:00', name: 'Treffpunkt & Ausgabe Tourshirts', address: 'Cafe Museum, Karlstraße 28', city: 'Weingarten', audience: 'ehemaligen', kind: 'stop' },
			{ time: '15:15', name: 'Kervan', address: 'Brechenmacherstraße 29', city: 'Weingarten', kind: 'stop' },
			{ time: '16:00', name: 'Kaspar', address: 'Kleintobler Höhe 25', city: 'Berg', kind: 'stop' },
			{ time: '17:15', name: 'Abgabe der Fahnen', address: 'Stadtgarten', city: 'Weingarten', kind: 'stop' },
			{ time: '18:00', name: 'Fahnenübergabe', address: 'Stadtgarten', city: 'Weingarten', kind: 'stop' },
			{ time: '19:30', name: 'Bürgertreff', address: 'Stadtgarten', city: 'Weingarten', kind: 'stop' },
			{ time: '20:00', name: 'Blues Rock Kneipe Linde', address: 'Heinrich-Schatz-Straße 27', city: 'Weingarten', kind: 'stop' },
			{ time: '20:30', name: 'Schinderhannes', address: 'Liebfrauenstraße 37', city: 'Weingarten', kind: 'stop' },
			{ time: '21:00', name: 'Großes Antrommeln', address: 'Cafe Museum, Karlstraße 28', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '22:00', name: 'SVW', address: 'Festplatz', city: 'Weingarten', kind: 'finale' }
		]
	},
	{
		date: '2026-07-11',
		label: 'Samstag 11. Juli',
		stops: [
			{ time: '06:15', name: 'EP', city: 'Weingarten', note: 'Antreten', kind: 'muster' },
			{ time: '07:00', name: 'Bäckerei Sauter', address: 'Blumenau 23', city: 'Weingarten', kind: 'stop' },
			{ time: '07:30', name: 'Stadtmetzgerei Isser', address: 'Hähnlehofstraße 104', city: 'Weingarten', kind: 'stop' },
			{ time: '08:00', name: 'Oehler', address: 'Rosenstraße 11', city: 'Baienfurt', kind: 'stop' },
			{ time: '08:40', name: 'Altdorf Apotheke', address: 'Zeppelinstraße 5', city: 'Weingarten', kind: 'stop' },
			{ time: '09:00', name: 'Gedenk-Antrommeln', address: 'Basilika-Vorplatz', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '09:30', name: 'Innenstadt', address: 'Karlstraße/Löwenplatz', city: 'Weingarten', kind: 'stop' },
			{ time: '10:00', name: 'Sektstation', address: 'Finanzamt', city: 'Weingarten', kind: 'stop' },
			{ time: '10:20', name: 'Stadtverwaltung', address: 'Rathaus', city: 'Weingarten', kind: 'stop' },
			{ time: '11:00', name: 'Walker', address: 'Bergstraße 60', city: 'Weingarten', kind: 'stop' },
			{ time: '12:00', name: 'Mündel', address: 'Listztweg 1', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '13:30', name: 'Steinhauser', address: 'Jakob-Reiner-Straße 2/2', city: 'Weingarten', kind: 'stop' },
			{ time: '14:00', name: 'Baumgärtner', address: 'Schussenstraße 10', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '15:00', name: 'Staudacher/Rall', address: 'Michael-Kraf-Straße 5', city: 'Weingarten', kind: 'stop' },
			{ time: '15:30', name: 'Grimm/Chico', address: 'Feuchtmayrstraße 26', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '16:30', name: 'Zimmerei Bernhardt', address: 'Brandenburgerstraße 31', city: 'Weingarten', kind: 'stop' },
			{ time: '17:00', name: 'Wiest', address: 'Lilienthal-Straße 12', city: 'Weingarten', kind: 'stop' },
			{ time: '17:30', name: 'Hund', address: 'Jägerstraße 4', city: 'Weingarten', kind: 'stop' },
			{ time: '18:00', name: 'Müller', address: 'Lehenstraße 3', city: 'Weingarten', kind: 'stop' },
			{ time: '18:30', name: 'Pech', address: 'Grimmastraße 78', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '19:30', name: 'Krause', address: 'Marienstraße 11', city: 'Weingarten', kind: 'stop' },
			{ time: '20:00', name: 'Enderle/Beck', address: 'Charmorweg 1/1', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '21:20', name: 'Bistro Florian', address: 'Brechenmacherstraße 10', city: 'Weingarten', kind: 'stop' },
			{ time: '22:00', name: 'Festplatz', address: 'Festplatz', city: 'Weingarten', kind: 'finale' },
			{ time: '22:15', name: 'SVW', address: 'Festplatz', city: 'Weingarten', kind: 'finale' }
		]
	},
	{
		date: '2026-07-12',
		label: 'Sonntag 12. Juli',
		stops: [
			{ time: '06:15', name: 'EP', city: 'Baienfurt', note: 'Antreten', kind: 'muster' },
			{ time: '07:00', name: 'Louwers', address: 'Friedenstraße 29', city: 'Baienfurt', kind: 'stop' },
			{ time: '', name: 'Noch offen', city: 'Baienfurt', kind: 'stop' },
			{ time: '08:30', name: 'Beck, Rainer', address: 'Haldenweg 10', city: 'Baienfurt', kind: 'stop' },
			{ time: '09:20', name: 'Zimmermann', address: 'Lammstraße 12', city: 'Baienfurt', kind: 'stop' },
			{ time: '10:00', name: 'Mascha', address: 'Eifelweg 10', city: 'Schlier', kind: 'stop' },
			{ time: '10:30', name: 'Ströbele/Hilebrand/Löffelholz', address: 'Kehrenberg 19', city: 'Schlier', audience: 'both', kind: 'stop' },
			{ time: '11:30', name: 'Wochner', address: 'Schumannstraße 17', city: 'Weingarten', kind: 'stop' },
			{ time: '12:15', name: 'Schneider/Beck', address: 'Sechserbrunnen', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '13:15', name: 'Baumhof', address: 'Mendelssohnstraße 9/3', city: 'Weingarten', kind: 'stop' },
			{ time: '13:50', name: 'Stiefenhofer', address: 'Gartenstraße 15', city: 'Berg', kind: 'stop' },
			{ time: '14:30', name: 'Meschenmoser', address: 'Baindterstraße 1', city: 'Baienfurt', audience: 'both', kind: 'stop' },
			{ time: '15:15', name: 'Eisele', address: 'Eggbachstraße 7', city: 'Baienfurt', kind: 'stop' },
			{ time: '16:00', name: 'Jäger/Strodel', address: 'Gablerstraße 15', city: 'Weingarten', kind: 'stop' },
			{ time: '16:50', name: 'Vorstand', address: 'Lindenhofstadion', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '17:30', name: 'Metzler', address: 'Bauernjörgstraße 51', city: 'Weingarten', kind: 'stop' },
			{ time: '18:10', name: 'Ruess', address: 'Bauernjörgstraße 21', city: 'Weingarten', kind: 'stop' },
			{ time: '18:50', name: 'Weber', address: 'Lazzaretstraße 54', city: 'Weingarten', kind: 'stop' },
			{ time: '19:30', name: 'Jahrgang 2016', address: 'Thumbstraße 8', city: 'Weingarten', audience: 'both', kind: 'stop' },
			{ time: '21:30', name: 'Festplatz', address: 'Festplatz', city: 'Weingarten', kind: 'finale' },
			{ time: '22:00', name: 'SVW', address: 'Festplatz', city: 'Weingarten', kind: 'finale' }
		]
	},
	{
		date: '2026-07-13',
		label: 'Montag 13. Juli',
		stops: [
			{ time: '07:30', name: 'EP', city: 'Weingarten', note: 'Antreten', kind: 'muster' },
			{ time: '08:15', name: 'Frick', address: 'Schützenstraße 7-9', city: 'Weingarten', kind: 'stop' },
			{ time: '09:00', name: 'Festumzug', address: 'Festumzug Weingarten', city: 'Weingarten', kind: 'stop' },
			{ time: '11:00', name: 'Polizei', address: 'Promenade 13/1', city: 'Weingarten', kind: 'stop' },
			{ time: '11:30', name: 'Weinhaus Betz', address: 'Schützenstraße 3', city: 'Weingarten', kind: 'stop' },
			{ time: '12:00', name: 'Scheurer', address: 'Talstraße 5', city: 'Weingarten', kind: 'stop' },
			{ time: '12:30', name: 'König/Zierhut/Steinmaßl', address: 'Schwanenweiher', city: 'Weingarten', kind: 'stop' },
			{ time: '14:10', name: 'Hund', address: 'Uhlandstraße 46', city: 'Baienfurt', kind: 'stop' },
			{ time: '15:30', name: 'Welfinchenrally', address: 'Talschule', city: 'Weingarten', kind: 'stop' },
			{ time: '16:00', name: 'Biergarten', address: 'Festplatz', city: 'Weingarten', kind: 'stop' },
			{ time: '16:30', name: 'Zechner', address: 'Postplatz 4', city: 'Weingarten', kind: 'stop' },
			{ time: '17:00', name: 'Brunnbauer', address: 'Thumbstraße 67', city: 'Weingarten', kind: 'stop' },
			{ time: '18:00', name: 'Boxauto', address: 'Festplatz', city: 'Weingarten', kind: 'stop' },
			{ time: '19:00', name: 'Lehrerfest', address: 'Gymnasium Weingarten', city: 'Weingarten', kind: 'stop' },
			{ time: '20:30', name: 'Alibi', address: 'St.-Longinus-Straße 1', city: 'Weingarten', kind: 'stop' },
			{ time: '21:15', name: 'Festplatz', address: 'Festplatz', city: 'Weingarten', kind: 'finale' },
			{ time: '21:45', name: 'SVW', address: 'Festplatz', city: 'Weingarten', kind: 'finale' }
		]
	},
	{
		date: '2026-07-14',
		label: 'Dienstag 14. Juli',
		stops: [
			{ time: '08:15', name: 'EP', city: 'Weingarten', note: 'Antreten', kind: 'muster' },
			{ time: '09:00', name: 'Gymnasium Weingarten', address: 'Brechenmacher Straße 19', city: 'Weingarten', kind: 'stop' },
			{ time: '09:15', name: 'Lehrerzimmer', address: 'Brechenmacher Straße 19', city: 'Weingarten', kind: 'stop' },
			{ time: '09:45', name: 'Tränkle', address: 'Waldseer Straße 10', city: 'Weingarten', kind: 'stop' },
			{ time: '10:05', name: 'Zahnarztpraxis Mündel', address: 'Promenade 1', city: 'Weingarten', kind: 'stop' },
			{ time: '10:20', name: 'Kreissparkasse Ravensburg', address: 'Liebfrauenstraße 10', city: 'Weingarten', kind: 'stop' },
			{ time: '10:45', name: 'Baustoff Mayer', address: 'Argonnenstraße 15', city: 'Weingarten', kind: 'stop' },
			{ time: '11:15', name: 'Habisreutinger', address: 'Schussenstraße 22', city: 'Weingarten', kind: 'stop' },
			{ time: '11:50', name: 'Martinus', address: 'Kirchplatz 4', city: 'Weingarten', kind: 'stop' },
			{ time: '13:10', name: 'Plus Punkt', address: 'Stefan-Rahl-Straße 16', city: 'Weingarten', kind: 'stop' },
			{ time: '13:40', name: 'Geschwister-Scholl-Schule', address: 'Geschwister-Scholl-Straße 2', city: 'Weingarten', kind: 'stop' },
			{ time: '14:30', name: 'Autohaus Riess', address: 'Jahnstraße 80', city: 'Ravensburg', kind: 'stop' },
			{ time: '15:00', name: 'Volksbank Weingarten', address: 'Kirchstraße 6', city: 'Weingarten', kind: 'stop' },
			{ time: '15:15', name: 'Max.Cafe', address: 'Kirchstraße 15', city: 'Weingarten', kind: 'stop' },
			{ time: '16:00', name: 'Busse putzen ARAL', address: 'Waldseer Straße 64', city: 'Weingarten', kind: 'finale' },
			{ time: '19:30', name: 'Festplatz', address: 'Festplatz', city: 'Weingarten', kind: 'finale' }
		]
	}
];

/** Stable identity for a stop. Shared with the travel-time generator so the
 *  keys in `travel.generated.json` line up with what the page looks up. */
export function stopKey(s: { date: string; time: string; name: string }): string {
	return `${s.date}|${s.time}|${s.name}`;
}

/** Location string for a stop's Google-Maps query, or null if unroutable. */
export function stopLocation(stop: Stop): string | null {
	const full = CITY_FULL[stop.city] ?? stop.city;
	const loc = stop.address && stop.address.toLowerCase() !== stop.city.toLowerCase() ? stop.address : stop.name;
	if (!loc) return null;
	return `${loc}, ${full}, Deutschland`;
}

/** Google-Maps directions link (from the viewer's location), or null. */
export function mapsUrl(stop: Stop): string | null {
	const loc = stopLocation(stop);
	if (!loc) return null;
	return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(loc)}`;
}
