/**
 * Stand-in for SvelteKit's `$app/environment` under Vitest (aliased in
 * `vitest.config.ts`). Unit tests run in jsdom, so `browser` defaults to true;
 * a test that needs the server path vi.mock()s this module with its own value.
 */
export const browser = true;
export const dev = true;
export const building = false;
export const version = 'test';
