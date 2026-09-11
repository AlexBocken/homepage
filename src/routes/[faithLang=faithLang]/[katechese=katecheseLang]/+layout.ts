import type { LayoutLoad } from './$types';

// The section's own slug — katechese or catechesis — so every page under it can
// build links without knowing which of the two the reader arrived on.
export const load: LayoutLoad = ({ params }) => ({ katechese: params.katechese });
