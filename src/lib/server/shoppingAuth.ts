/**
 * Shared auth for shopping list endpoints.
 * Accepts either a logged-in session or a valid share token.
 */
import { dbConnect } from '$utils/db';
import { ShoppingShareToken } from '$models/ShoppingShareToken';
import crypto from 'crypto';

/** Returns a nickname string if authorized, null otherwise */
export async function getShoppingUser(
  locals: App.Locals,
  url: URL
): Promise<string | null> {
  // Check session first
  const auth = await locals.auth();
  if (auth?.user?.nickname) return auth.user.nickname;

  // Check share token
  const token = url.searchParams.get('token');
  if (!token) return null;

  await dbConnect();
  const doc = await ShoppingShareToken.findOne({
    token,
    expiresAt: { $gt: new Date() }
  }).lean();

  return doc ? `guest` : null;
}

/** Check if a share token is valid (for hooks middleware) */
export async function validateShareToken(token: string): Promise<boolean> {
  await dbConnect();
  const doc = await ShoppingShareToken.findOne({
    token,
    expiresAt: { $gt: new Date() }
  }).lean();
  return !!doc;
}

/** Generate a new share token (24h TTL) */
export async function createShareToken(createdBy: string): Promise<{ token: string; expiresAt: Date }> {
  await dbConnect();

  const token = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await ShoppingShareToken.create({ token, expiresAt, createdBy });

  return { token, expiresAt };
}
