import { error } from '@sveltejs/kit';
import mongoose from 'mongoose';

/**
 * Throw a 400 unless `id` is a syntactically valid Mongo ObjectId. Replaces the
 * `if (!mongoose.Types.ObjectId.isValid(id)) …400` guard that every `[id]`
 * fitness endpoint hand-rolled (and imported mongoose solely to call).
 *
 * @param label appended after "Invalid " in the message, e.g. 'session ID'.
 */
export function assertObjectId(id: string, label = 'ID'): void {
	if (!mongoose.Types.ObjectId.isValid(id)) throw error(400, `Invalid ${label}`);
}

/**
 * Load a Mongoose document by id scoped to its owner, or throw. Validates the
 * ObjectId (400) then 404s when the document is missing or not owned by
 * `nickname`. Returns the live (non-lean) document so callers can mutate + save.
 *
 * @param label human name used in the 400/404 messages, e.g. 'Measurement'.
 */
export async function findOwnedOr404<T>(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	model: { findOne: (filter: Record<string, unknown>) => any },
	id: string,
	nickname: string,
	label = 'Resource'
): Promise<T> {
	assertObjectId(id, `${label} ID`);
	const doc = await model.findOne({ _id: id, createdBy: nickname });
	if (!doc) throw error(404, `${label} not found`);
	return doc as T;
}
