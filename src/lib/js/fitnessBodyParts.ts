import type { FitnessKey } from './fitnessI18n';

export type SingleBodyPartCard = {
	key: string;
	slugDe: string;
	labelKey: FitnessKey;
	img: string | null;
	/** How to measure it, shown on the check-in wizard's step. */
	tipKey: FitnessKey;
	paired: false;
	db: string;
};
export type PairedBodyPartCard = {
	key: string;
	slugDe: string;
	labelKey: FitnessKey;
	img: string | null;
	/** How to measure it, shown on the check-in wizard's step. */
	tipKey: FitnessKey;
	paired: true;
	dbLeft: string;
	dbRight: string;
	/** Per-side labels ("L Bicep" / "R Bicep"). */
	labelLeft: FitnessKey;
	labelRight: FitnessKey;
};
export type BodyPartCard = SingleBodyPartCard | PairedBodyPartCard;

export const BODY_PART_CARDS: BodyPartCard[] = [
	{ key: 'neck',      slugDe: 'hals',         labelKey: 'neck',      img: 'neck.svg',      tipKey: 'measure_tip_neck',      paired: false, db: 'neck' },
	{ key: 'shoulders', slugDe: 'schultern',    labelKey: 'shoulders', img: 'back.svg',      tipKey: 'measure_tip_shoulders', paired: false, db: 'shoulders' },
	{ key: 'chest',     slugDe: 'brust',        labelKey: 'chest',     img: 'shoulders.svg', tipKey: 'measure_tip_chest',     paired: false, db: 'chest' },
	{ key: 'biceps',    slugDe: 'bizeps',       labelKey: 'biceps',    img: 'bicep.svg',     tipKey: 'measure_tip_biceps',    paired: true,  dbLeft: 'leftBicep',   dbRight: 'rightBicep',   labelLeft: 'l_bicep',   labelRight: 'r_bicep' },
	{ key: 'forearms',  slugDe: 'unterarme',    labelKey: 'forearms',  img: 'forearm.svg',   tipKey: 'measure_tip_forearms',  paired: true,  dbLeft: 'leftForearm', dbRight: 'rightForearm', labelLeft: 'l_forearm', labelRight: 'r_forearm' },
	{ key: 'waist',     slugDe: 'taille',       labelKey: 'waist',     img: 'waist.svg',     tipKey: 'measure_tip_waist',     paired: false, db: 'waist' },
	{ key: 'hips',      slugDe: 'huefte',       labelKey: 'hips',      img: 'hips.svg',      tipKey: 'measure_tip_hips',      paired: false, db: 'hips' },
	{ key: 'thighs',    slugDe: 'oberschenkel', labelKey: 'thighs',    img: 'thigh.svg',     tipKey: 'measure_tip_thighs',    paired: true,  dbLeft: 'leftThigh',   dbRight: 'rightThigh',   labelLeft: 'l_thigh',   labelRight: 'r_thigh' },
	{ key: 'calves',    slugDe: 'waden',        labelKey: 'calves',    img: 'calves.svg',    tipKey: 'measure_tip_calves',    paired: true,  dbLeft: 'leftCalf',    dbRight: 'rightCalf',    labelLeft: 'l_calf',    labelRight: 'r_calf' }
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
