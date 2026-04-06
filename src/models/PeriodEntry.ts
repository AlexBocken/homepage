import mongoose from 'mongoose';

export interface IPeriodEntry {
	_id?: string;
	startDate: Date;
	endDate?: Date;
	createdBy: string;
	createdAt?: Date;
	updatedAt?: Date;
}

const PeriodEntrySchema = new mongoose.Schema(
	{
		startDate: { type: Date, required: true },
		endDate: { type: Date, default: null },
		createdBy: { type: String, required: true, trim: true }
	},
	{ timestamps: true }
);

PeriodEntrySchema.index({ createdBy: 1, startDate: -1 });

export const PeriodEntry = mongoose.model<IPeriodEntry>('PeriodEntry', PeriodEntrySchema);
