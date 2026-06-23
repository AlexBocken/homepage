import mongoose from 'mongoose';

// A revocable subscription link to a period calendar (ICS feed). The feed is
// gated by HTTP Basic Auth: username = the generator's nickname (createdBy),
// password = token. The data served is dataOwner's period entries — which may be
// the generator themselves, or another user who shared their tracker with them.
// Deleting the doc revokes that one subscription.
export interface IPeriodCalendarToken {
	token: string;
	dataOwner: string; // nickname whose period entries this feed serves (PeriodEntry.createdBy)
	createdBy: string; // generator nickname (lowercased) — the Basic Auth username
	label: string; // free-text note: who / which device this link is for
	createdAt?: Date;
	updatedAt?: Date;
}

const PeriodCalendarTokenSchema = new mongoose.Schema(
	{
		token: { type: String, required: true, unique: true, index: true },
		dataOwner: { type: String, required: true, index: true, trim: true },
		createdBy: { type: String, required: true, index: true, trim: true },
		label: { type: String, default: '', trim: true }
	},
	{ timestamps: true }
);

export const PeriodCalendarToken =
	(mongoose.models.PeriodCalendarToken as mongoose.Model<IPeriodCalendarToken>) ||
	mongoose.model<IPeriodCalendarToken>('PeriodCalendarToken', PeriodCalendarTokenSchema);
