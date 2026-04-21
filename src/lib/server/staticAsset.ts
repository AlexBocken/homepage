import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

// adapter-node bundles server code into build/server/chunks/*.js;
// public static assets end up at build/client/. Resolve there first
// so deploys that sit `build/` at any prefix work without a CWD.
const BUILD_STATIC = resolve(MODULE_DIR, '..', '..', 'client');

// Dev (vite/vite-node): CWD is the project root, raw static/ lives there.
const DEV_STATIC = resolve('static');

export function resolveStaticAsset(name: string): string {
	const bundled = resolve(BUILD_STATIC, name);
	if (existsSync(bundled)) return bundled;
	return resolve(DEV_STATIC, name);
}
