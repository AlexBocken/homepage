import { requireFinanceOwner } from '$lib/server/middleware/auth';
import { createApiTokenRoutes } from '$lib/server/apiTokenRoutes';
import { FinanceApiToken } from '$models/FinanceApiToken';

// Manage the owner's finance export tokens. Owner session only (the whole
// /api/finances tree is gated on the owner's nickname in hooks.server.ts; the check
// here is defence-in-depth); the tokens themselves are used on
// /api/finances/export.
const routes = createApiTokenRoutes(FinanceApiToken, requireFinanceOwner);

/** GET: list the owner's tokens (full value included so the panel can show/copy). */
export const GET = routes.GET;
/** POST: mint a new token. Body: { label? }. */
export const POST = routes.POST;
