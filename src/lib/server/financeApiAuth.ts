/**
 * Token auth for the /finances overrides export (/api/finances/export). See
 * ./apiTokenAuth.ts for how a token is presented and checked.
 */
import { FinanceApiToken } from '$models/FinanceApiToken';
import { createApiTokenAuth } from './apiTokenAuth';

export const verifyFinanceApiToken = createApiTokenAuth(FinanceApiToken);
