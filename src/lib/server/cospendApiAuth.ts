/**
 * Token auth for the cospend export API (/api/cospend/export). See
 * ./apiTokenAuth.ts for how a token is presented and checked.
 */
import { CospendApiToken } from '$models/CospendApiToken';
import { createApiTokenAuth } from './apiTokenAuth';

export const verifyCospendApiToken = createApiTokenAuth(CospendApiToken);
