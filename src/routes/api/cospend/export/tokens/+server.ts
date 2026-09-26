import { requireGroup } from '$lib/server/middleware/auth';
import { createApiTokenRoutes } from '$lib/server/apiTokenRoutes';
import { CospendApiToken } from '$models/CospendApiToken';

// Manage the caller's own cospend export tokens. Session + `cospend` group only
// (enforced by requireGroup); the tokens themselves are used on /api/cospend/export.
const routes = createApiTokenRoutes(CospendApiToken, (locals) => requireGroup(locals, 'cospend'));

/** GET: list the caller's tokens (full value included so the panel can show/copy). */
export const GET = routes.GET;
/** POST: mint a new token. Body: { label? }. */
export const POST = routes.POST;
