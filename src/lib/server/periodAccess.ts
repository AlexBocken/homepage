import { PeriodShare } from '$models/PeriodShare';

/**
 * Whether `user` may modify `owner`'s period calendar: true if they are the
 * owner, or the owner has shared their calendar with them. `sharedWith` stores
 * lowercase usernames, so the membership check normalizes case.
 */
export async function canEditPeriodCalendar(user: string, owner: string): Promise<boolean> {
	if (user.toLowerCase() === owner.toLowerCase()) return true;
	const share = await PeriodShare.findOne({ owner, sharedWith: user.toLowerCase() }).lean();
	return !!share;
}
