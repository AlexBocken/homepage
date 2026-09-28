import { json, error, type RequestHandler } from '@sveltejs/kit';
import type { Model } from 'mongoose';
import { dbConnect } from '$utils/db';
import { requireAuth } from '$lib/server/middleware/auth';

export interface StreakApiSpec {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	model: Model<any>;
	/** Named in the 500 messages: "Failed to fetch <what>". */
	what: string;
	/** Every field the API answers with, in order, and its value when unset. */
	fields: Record<string, unknown>;
	/** The epoch-ms field, only written when the client sends a number. */
	timestampField: string;
	/** Throws the 400 for a body the store should never have sent. */
	validate: (body: Record<string, unknown>) => void;
}

/**
 * GET and POST for a per-user prayer streak (rosary, Angelus): GET answers the
 * reader's document, or defaults when there is none; POST validates the
 * store's whole streak and upserts it.
 */
export function streakHandlers(spec: StreakApiSpec): { GET: RequestHandler; POST: RequestHandler } {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const answer = (doc: any) =>
		Object.fromEntries(Object.entries(spec.fields).map(([key, fallback]) => [key, doc?.[key] ?? fallback]));

	const GET: RequestHandler = async ({ locals }) => {
		const user = await requireAuth(locals);

		await dbConnect();

		try {
			const streak = await spec.model.findOne({ username: user.nickname }).lean();
			return json(answer(streak));
		} catch {
			throw error(500, `Failed to fetch ${spec.what}`);
		}
	};

	const POST: RequestHandler = async ({ request, locals }) => {
		const user = await requireAuth(locals);

		const body = await request.json();
		spec.validate(body);

		await dbConnect();

		try {
			const updateFields: Record<string, unknown> = {};
			for (const key of Object.keys(spec.fields)) {
				if (key !== spec.timestampField) updateFields[key] = body[key];
			}
			if (typeof body[spec.timestampField] === 'number') {
				updateFields[spec.timestampField] = body[spec.timestampField];
			}

			const updated = await spec.model
				.findOneAndUpdate({ username: user.nickname }, updateFields, { upsert: true, returnDocument: 'after' })
				.lean();

			return json(answer(updated));
		} catch {
			throw error(500, `Failed to update ${spec.what}`);
		}
	};

	return { GET, POST };
}
