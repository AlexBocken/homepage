import { HTTP_ERROR_STATUSES } from '../../../../params/httpStatus';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;
export const ssr = true;
export const csr = false;

export const entries: EntryGenerator = () =>
  HTTP_ERROR_STATUSES.map((status) => ({ status }));

export const load: PageLoad = ({ params }) => ({
  status: parseInt(params.status, 10)
});
