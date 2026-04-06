import mongoose from 'mongoose';

export interface IPeriodShare {
	owner: string;
	sharedWith: string[];
}

const PeriodShareSchema = new mongoose.Schema(
	{
		owner: { type: String, required: true, unique: true, trim: true },
		sharedWith: [{ type: String, trim: true }]
	},
	{ timestamps: true }
);

PeriodShareSchema.index({ sharedWith: 1 });

export const PeriodShare = mongoose.model<IPeriodShare>('PeriodShare', PeriodShareSchema);
