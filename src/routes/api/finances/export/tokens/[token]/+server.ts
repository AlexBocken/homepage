import { requireFinanceOwner } from '$lib/server/middleware/auth';
import { createApiTokenRoutes } from '$lib/server/apiTokenRoutes';
import { FinanceApiToken } from '$models/FinanceApiToken';

/** DELETE: revoke one of the owner's own export tokens. */
export const DELETE = createApiTokenRoutes(FinanceApiToken, requireFinanceOwner).DELETE;
