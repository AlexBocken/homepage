import type { RequestHandler } from './$types';
import { servePeriodICS } from '$lib/server/periodIcsFeed';

// Public, Basic-Auth-gated English period calendar feed. The optional [[name]]
// segment is cosmetic (lets calendar apps pre-fill a default name).
export const GET: RequestHandler = (event) => servePeriodICS(event, 'en');
