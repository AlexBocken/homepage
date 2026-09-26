import mongoose from 'mongoose';

// Shared shape of the revocable export-API tokens (CospendApiToken,
// FinanceApiToken). Each lets a script pull one read-only export without an
// interactive OIDC login. Modeled on PeriodCalendarToken: the token is a 192-bit
// URL-safe random string, stored so it can be shown/copied again and revoked by
// deleting the row. No expiry. `createdBy` records the minter (lowercased
// nickname); `lastUsedAt` is touched on each successful export for
// auditing/cleanup.
export interface IApiToken {
	token: string;
	createdBy: string; // nickname (lowercased) of the minter
	label: string; // free-text note: which importer/machine this token is for
	lastUsedAt?: Date | null;
	createdAt?: Date;
	updatedAt?: Date;
}

export type ApiTokenModel = mongoose.Model<IApiToken>;

/**
 * The model registered under `name`, created on first use. The model name (and
 * with it the collection, e.g. 'cospendapitokens') is where the stored tokens
 * live, so it must never change for an existing token kind.
 */
export function apiTokenModel(name: string): ApiTokenModel {
	const existing = mongoose.models[name] as ApiTokenModel | undefined;
	if (existing) return existing;
	const schema = new mongoose.Schema<IApiToken>(
		{
			token: { type: String, required: true, unique: true, index: true },
			createdBy: { type: String, required: true, index: true, trim: true },
			label: { type: String, default: '', trim: true },
			lastUsedAt: { type: Date, default: null }
		},
		{ timestamps: true }
	);
	return mongoose.model<IApiToken>(name, schema);
}
