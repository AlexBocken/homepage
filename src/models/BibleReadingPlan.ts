import mongoose from 'mongoose';

/** A pace as it stood from `from` on. See `paces` below. */
const PacePointSchema = new mongoose.Schema(
	{
		from: { type: String, required: true },
		minutesPerDay: { type: Number, required: true, min: 1, max: 240 }
	},
	{ _id: false }
);

/**
 * A reader's plan: which shape, at what pace, since when. It keeps no list
 * of chapters; progress is the plan's chapters intersected with the reading
 * log (`BibleChapterRead`), from `startDate` on, or from the beginning when
 * `creditEarlier` is set. One active plan per user; the ones it replaced stay,
 * for the days they covered. Switching costs nothing: the log outlives every
 * plan, so a plan taken up again picks its own chapters back out of it.
 */
const BibleReadingPlanSchema = new mongoose.Schema(
	{
		username: { type: String, required: true },
		plan: { type: String, required: true, enum: ['historia', 'canon', 'nt-psalms', 'nt', 'ot'] },
		/** Fixes the word table the pace is measured against. */
		lang: { type: String, required: true, enum: ['de', 'en'] },
		/** The pace that stands now — what today's portion is cut to. */
		minutesPerDay: { type: Number, required: true, min: 1, max: 240 },
		/**
		 * The pace as it changed, ascending. A past day is judged by the pace
		 * that stood on it, so raising the goal never unmakes a day already met.
		 */
		paces: { type: [PacePointSchema], default: [] },
		/** Local YYYY-MM-DD of the day the plan began. */
		startDate: { type: String, required: true },
		/**
		 * Local YYYY-MM-DD of the day it stopped being the active one; null
		 * while it runs. The streak reads a day under the plan that ran that
		 * day, so taking up another leaves the earlier days alone.
		 */
		endDate: { type: String, default: null },
		creditEarlier: { type: Boolean, required: true, default: false },
		active: { type: Boolean, required: true, default: true },
		finishedAt: { type: Date, default: null }
	},
	{ timestamps: true }
);
BibleReadingPlanSchema.index({ username: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });

export type PlanShape = 'historia' | 'canon' | 'nt-psalms' | 'nt' | 'ot';
export interface IPacePoint {
	from: string;
	minutesPerDay: number;
}
export interface IBibleReadingPlan {
	username: string;
	plan: PlanShape;
	lang: 'de' | 'en';
	minutesPerDay: number;
	paces: IPacePoint[];
	startDate: string;
	endDate: string | null;
	creditEarlier: boolean;
	active: boolean;
	finishedAt: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
}

let _model: mongoose.Model<IBibleReadingPlan>;
try {
	_model = mongoose.model<IBibleReadingPlan>('BibleReadingPlan');
} catch {
	_model = mongoose.model<IBibleReadingPlan>('BibleReadingPlan', BibleReadingPlanSchema);
}
export const BibleReadingPlan = _model;
