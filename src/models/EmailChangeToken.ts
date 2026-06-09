import mongoose from 'mongoose';

/**
 * Pending self-service email-address change. The raw token is emailed to the
 * NEW address; only its SHA-256 hash is stored here. Single-use (deleted on
 * verification) and auto-expired via a TTL index.
 */
export interface IEmailChangeToken {
	tokenHash: string;
	pk: number;
	username: string;
	newEmail: string;
	expiresAt: Date;
}

const EmailChangeTokenSchema = new mongoose.Schema(
	{
		tokenHash: { type: String, required: true, unique: true, index: true },
		pk: { type: Number, required: true },
		username: { type: String, required: true },
		newEmail: { type: String, required: true },
		expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
	},
	{ timestamps: true }
);

export const EmailChangeToken =
	mongoose.models.EmailChangeToken ||
	mongoose.model<IEmailChangeToken>('EmailChangeToken', EmailChangeTokenSchema);
