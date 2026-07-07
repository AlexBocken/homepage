import mongoose from 'mongoose';

// A revocable API token that lets a script (e.g. a beancount importer) pull the
// cospend ledger as JSON without an interactive OIDC login. Modeled on
// PeriodCalendarToken: the token is a 192-bit URL-safe random string, stored so
// it can be shown/copied again and revoked by deleting the row. No expiry.
//
// The token grants read-only access to the WHOLE shared cospend ledger (cospend
// is a single shared collection gated on the `cospend` Authentik group), so it
// may only be minted by a member of that group. `createdBy` records who minted
// it; `lastUsedAt` is touched on each successful export for auditing/cleanup.
export interface ICospendApiToken {
	token: string;
	createdBy: string; // nickname (lowercased) of the minter — must be in the `cospend` group
	label: string; // free-text note: which importer/machine this token is for
	lastUsedAt?: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
}

const CospendApiTokenSchema = new mongoose.Schema(
	{
		token: { type: String, required: true, unique: true, index: true },
		createdBy: { type: String, required: true, index: true, trim: true },
		label: { type: String, default: '', trim: true },
		lastUsedAt: { type: Date, default: null }
	},
	{ timestamps: true }
);

export const CospendApiToken =
	(mongoose.models.CospendApiToken as mongoose.Model<ICospendApiToken>) ||
	mongoose.model<ICospendApiToken>('CospendApiToken', CospendApiTokenSchema);
