// Shared types for the liturgical calendar. Safe to import from both server
// loaders and client components (pure type declarations).

export interface CalendarDay {
	iso: string;
	id: string;
	name: string;
	rankName: string;
	rank: string;
	seasonKey: string | null;
	seasonNames: string[];
	colorNames: string[];
	colorKeys: string[];
	psalterWeek: string | null;
	sundayCycle: string | null;
	rite1962?: Rite1962Detail;
}

// Compact per-day shape returned for the full window of the liturgical year.
// Kept to the bare minimum needed client-side: the ring needs a color for the
// needle on the selected day (which may be a ferial with no rank metadata),
// everything else goes through the separate `feastDots` array.
export interface YearDay {
	iso: string;
	color: string; // primary color key (WHITE/RED/...)
}

// Pre-filtered list of days that render a feast dot on the ring — rank > feria
// — with the metadata the ring and side panel need for each. Sent alongside
// YearDay so clients don't have to filter 365 entries themselves.
export interface FeastDot {
	iso: string;
	name: string;
	rank: string;
	color: string;
}

export interface SeasonArc {
	key: string;
	name: string;
	start: string;
	end: string;
	color: string;
}

export interface Rite1962Commem {
	id: string;
	name: string;
}

export interface Rite1962StationChurch {
	key: string;
	name: string;
	mass?: string;
}

export interface Rite1962Detail {
	class: 1 | 2 | 3 | 4;
	kind: 'tempora' | 'sancti';
	commemorations: Rite1962Commem[];
	stationChurches?: Rite1962StationChurch[];
	octave?: {
		ofId: string;
		day: number;
	};
	vigilOf?: string;
	transferredFrom?: string;
	propers: ProperSection[];
}

export interface ProperSection {
	key: string;
	la: string[];
	local: string[];
	refs?: string[];
	refLabel?: string;
	localFromBible?: boolean;
}
