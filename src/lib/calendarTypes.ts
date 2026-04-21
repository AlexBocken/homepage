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

// Compact per-day shape returned for the full year so the ring / month-grid
// overview views can render without refetching. Kept small on purpose.
export interface YearDay {
	iso: string;
	name: string;
	rank: string;
	color: string; // primary color key (WHITE/RED/...)
	seasonKey: string | null;
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
}
