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
	key: string;
	name: string;
	rankName: string;
	kind: 'tempora' | 'sancti';
	colorNames: string[];
	colorKeys: string[];
}

export interface Rite1962Detail {
	class: 1 | 2 | 3 | 4;
	kind: 'tempora' | 'sancti';
	commemorations: Rite1962Commem[];
	rubrics: {
		gloria: boolean;
		credo: boolean;
		preface?: string;
		lastGospel?: string;
		ite?: string;
	};
	octave?: {
		id: string;
		parentFeastId: string;
		day: number;
		rank: string;
	};
	vigilOf?: string;
	transferredFrom?: string;
	properSource: string;
	communeSlug?: string;
	propers: ProperSection[];
	extraSections: ProperSection[];
}

export interface ProperSegment {
	refs: string[];
	la: string;
	local?: string;
	// When true, `local` text comes from the Bible translation lookup because
	// the propers dataset had no localized text for this segment.
	fromBible?: boolean;
}

export interface ProperSection {
	key: string;
	segments: ProperSegment[];
	// Aggregate list of refs across segments (for quick checks)
	refs: string[];
	fromBible?: boolean;
}
