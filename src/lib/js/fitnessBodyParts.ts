export type SingleBodyPartCard = {
	key: string;
	slugDe: string;
	labelKey: string;
	img: string | null;
	paired: false;
	db: string;
};
export type PairedBodyPartCard = {
	key: string;
	slugDe: string;
	labelKey: string;
	img: string | null;
	paired: true;
	dbLeft: string;
	dbRight: string;
};
export type BodyPartCard = SingleBodyPartCard | PairedBodyPartCard;

export const BODY_PART_CARDS: BodyPartCard[] = [
	{ key: 'neck',      slugDe: 'hals',         labelKey: 'neck',      img: 'neck.png',      paired: false, db: 'neck' },
	{ key: 'shoulders', slugDe: 'schultern',    labelKey: 'shoulders', img: 'back.png',      paired: false, db: 'shoulders' },
	{ key: 'chest',     slugDe: 'brust',        labelKey: 'chest',     img: 'shoulders.png', paired: false, db: 'chest' },
	{ key: 'biceps',    slugDe: 'bizeps',       labelKey: 'biceps',    img: 'bicep.png',     paired: true,  dbLeft: 'leftBicep',   dbRight: 'rightBicep' },
	{ key: 'forearms',  slugDe: 'unterarme',    labelKey: 'forearms',  img: 'forearm.svg',   paired: true,  dbLeft: 'leftForearm', dbRight: 'rightForearm' },
	{ key: 'waist',     slugDe: 'taille',       labelKey: 'waist',     img: 'waist.png',     paired: false, db: 'waist' },
	{ key: 'hips',      slugDe: 'huefte',       labelKey: 'hips',      img: 'hips.png',      paired: false, db: 'hips' },
	{ key: 'thighs',    slugDe: 'oberschenkel', labelKey: 'thighs',    img: 'thigh.svg',     paired: true,  dbLeft: 'leftThigh',   dbRight: 'rightThigh' },
	{ key: 'calves',    slugDe: 'waden',        labelKey: 'calves',    img: 'calves.png',    paired: true,  dbLeft: 'leftCalf',    dbRight: 'rightCalf' }
];

export function findBodyPart(slug: string): BodyPartCard | null {
	return BODY_PART_CARDS.find((c) => c.key === slug || c.slugDe === slug) ?? null;
}

export function bodyPartSlug(card: BodyPartCard, lang: string): string {
	return lang === 'de' ? card.slugDe : card.key;
}

const PROPORTION_KEYS: ReadonlySet<string> = new Set(['chest', 'shoulders', 'waist', 'hips']);

export function bodyPartAccent(key: string): string {
	return PROPORTION_KEYS.has(key) ? 'var(--blue)' : 'var(--nord8)';
}
