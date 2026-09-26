import { requireGroup } from '$lib/server/middleware/auth';
import { createApiTokenRoutes } from '$lib/server/apiTokenRoutes';
import { CospendApiToken } from '$models/CospendApiToken';

/** DELETE: revoke one of the caller's own export tokens. */
export const DELETE = createApiTokenRoutes(CospendApiToken, (locals) =>
	requireGroup(locals, 'cospend')
).DELETE;
