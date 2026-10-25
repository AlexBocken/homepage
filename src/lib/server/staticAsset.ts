import { fileURLToPath } from 'node:url';
import { basename, dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));

// adapter-node bundles server code somewhere under build/server/ — how deep
// depends on the bundler (chunks/*.js, now chunks/chunks/*.js) — and public
// static assets end up at build/client/. Walk up to server/ and take its
// sibling, so deploys that sit `build/` at any prefix work without a CWD.
function buildStatic(): string | null {
	for (let dir = MODULE_DIR; dir !== dirname(dir); dir = dirname(dir)) {
		if (basename(dir) === 'server') return resolve(dir, '..', 'client');
	}
	return null;
}
const BUILD_STATIC = buildStatic();

// Dev (vite/vite-node): CWD is the project root, raw static/ lives there.
const DEV_STATIC = resolve('static');

export function resolveStaticAsset(name: string): string {
	if (BUILD_STATIC) {
		const bundled = resolve(BUILD_STATIC, name);
		if (existsSync(bundled)) return bundled;
	}
	return resolve(DEV_STATIC, name);
}
