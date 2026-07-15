import mongoose from 'mongoose';

// A revocable API token that lets the ledger repo's pull script fetch the stored
// /finances categorizations (overrides CSV) without an interactive OIDC login.
// Modeled on CospendApiToken: a 192-bit URL-safe random string, stored so it can
// be shown/copied again and revoked by deleting the row. No expiry.
//
// The /finances area is owner-only (Authentik nickname === 'alexander'), so a
// token may only be minted by that owner and grants read-only access to the
// overrides export. `createdBy` records the minter; `lastUsedAt` is touched on
// each successful export for auditing/cleanup.
export interface IFinanceApiToken {
	token: string;
	createdBy: string; // nickname (lowercased) of the minter — the finances owner
	label: string; // free-text note: which machine/importer this token is for
	lastUsedAt?: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
}

const FinanceApiTokenSchema = new mongoose.Schema(
	{
		token: { type: String, required: true, unique: true, index: true },
		createdBy: { type: String, required: true, index: true, trim: true },
		label: { type: String, default: '', trim: true },
		lastUsedAt: { type: Date, default: null }
	},
	{ timestamps: true }
);

export const FinanceApiToken =
	(mongoose.models.FinanceApiToken as mongoose.Model<IFinanceApiToken>) ||
	mongoose.model<IFinanceApiToken>('FinanceApiToken', FinanceApiTokenSchema);
