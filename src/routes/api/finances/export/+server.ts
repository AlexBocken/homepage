import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { verifyFinanceApiToken } from '$lib/server/financeApiAuth';
import { overridesCsv } from '$lib/server/financeOverrides';

// Read-only export of the stored /finances categorizations as CSV, for the
// ledger repo's pull script (accounting/tools/pull_overrides.sh). Authenticated
// by a finance API token only — no OIDC session. hooks.server.ts lets this exact
// path through the /api/finances owner gate when a valid token is present; we
// re-verify here as defence in depth.
//
// Schema matches the ledger repo's overrides.csv exactly:
//     key,account,date,amount,payee,narration

export const GET: RequestHandler = async ({ request, url }) => {
	const tokenDoc = await verifyFinanceApiToken(request, url);
	if (!tokenDoc) {
		throw error(401, 'Invalid or missing finance API token.');
	}

	const csv = await overridesCsv();
	return new Response(csv, {
		status: 200,
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': 'attachment; filename="overrides.csv"',
			'cache-control': 'no-store'
		}
	});
};
