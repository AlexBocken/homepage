import mongoose from 'mongoose';

/**
 * The permanent reading log of the Bible reader: one row per chapter read on
 * a day. It outlives every reading plan; plans only look at it. A chapter
 * read again on another day gets another row, so rereads stay visible.
 */
const BibleChapterReadSchema = new mongoose.Schema(
	{
		username: { type: String, required: true },
		/** Canon slug and chapter: "joh/3". */
		key: { type: String, required: true },
		/** The reader's local calendar day, YYYY-MM-DD. */
		day: { type: String, required: true },
		ts: { type: Number, required: true },
		/** The plan that was active, if any; informational. */
		planId: { type: mongoose.Schema.Types.ObjectId, default: null }
	},
	{ timestamps: false }
);
BibleChapterReadSchema.index({ username: 1, key: 1, day: 1 }, { unique: true });
BibleChapterReadSchema.index({ username: 1, day: 1 });

export interface IBibleChapterRead {
	username: string;
	key: string;
	day: string;
	ts: number;
	planId: mongoose.Types.ObjectId | null;
}

let _model: mongoose.Model<IBibleChapterRead>;
try {
	_model = mongoose.model<IBibleChapterRead>('BibleChapterRead');
} catch {
	_model = mongoose.model<IBibleChapterRead>('BibleChapterRead', BibleChapterReadSchema);
}
export const BibleChapterRead = _model;
