import { apiTokenModel, type IApiToken } from './apiToken';

// A revocable API token that lets a script (e.g. a beancount importer) pull the
// cospend ledger as JSON without an interactive OIDC login. Schema and
// lifecycle: see ./apiToken.ts.
//
// The token grants read-only access to the WHOLE shared cospend ledger (cospend
// is a single shared collection gated on the `cospend` Authentik group), so it
// may only be minted by a member of that group.
export type ICospendApiToken = IApiToken;

export const CospendApiToken = apiTokenModel('CospendApiToken');
