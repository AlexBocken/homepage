import { apiTokenModel, type IApiToken } from './apiToken';

// A revocable API token that lets the ledger repo's pull script fetch the stored
// /finances categorizations (overrides CSV) without an interactive OIDC login.
// Schema and lifecycle: see ./apiToken.ts.
//
// The /finances area is owner-only (FINANCE_OWNER in $lib/config/users), so a
// token may only be minted by that owner and grants read-only access to the
// overrides export.
export type IFinanceApiToken = IApiToken;

export const FinanceApiToken = apiTokenModel('FinanceApiToken');
