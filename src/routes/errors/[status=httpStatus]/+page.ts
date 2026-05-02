import { HTTP_ERROR_STATUSES } from '../../../params/httpStatus';
import type { PageLoad, EntryGenerator } from './$types';

// Prerendered, JS-less status pages used as nginx error_page fallbacks.
// One HTML file per status; postbuild inliner self-contains them.
export const prerender = true;
export const ssr = true;
export const csr = false;

export const entries: EntryGenerator = () =>
  HTTP_ERROR_STATUSES.map((status) => ({ status }));

export const load: PageLoad = ({ params }) => ({
  status: parseInt(params.status, 10)
});
