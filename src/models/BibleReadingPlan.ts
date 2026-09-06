import mongoose from 'mongoose';

/**
 * A reader's plan: which shape, at what pace, since when. It keeps no list
 * of chapters; progress is the plan's chapters intersected with the reading
 * log (`BibleChapterRead`), from `startDate` on, or from the beginning when
 * `creditEarlier` is set. One active plan per user; finished ones stay.
 */
const BibleReadingPlanSchema = new mongoose.Schema(
	{
		username: { type: String, required: true },
		plan: { type: String, required: true, enum: ['historia', 'canon', 'nt-psalms', 'nt', 'ot'] },
		/** Fixes the word table the pace is measured against. */
		lang: { type: String, required: true, enum: ['de', 'en'] },
		minutesPerDay: { type: Number, required: true, min: 1, max: 240 },
		/** Local YYYY-MM-DD of the day the plan began. */
		startDate: { type: String, required: true },
		creditEarlier: { type: Boolean, required: true, default: false },
		active: { type: Boolean, required: true, default: true },
		finishedAt: { type: Date, default: null }
	},
	{ timestamps: true }
);
BibleReadingPlanSchema.index({ username: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });

export type PlanShape = 'historia' | 'canon' | 'nt-psalms' | 'nt' | 'ot';
export interface IBibleReadingPlan {
	username: string;
	plan: PlanShape;
	lang: 'de' | 'en';
	minutesPerDay: number;
	startDate: string;
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
