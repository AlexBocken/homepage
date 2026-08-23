/**
 * Rebuild sharp from source against the system libvips, so it can read HEIC.
 *
 * sharp's prebuilt binaries deliberately ship without HEVC support — the
 * codec is patent-encumbered, so libheif is bundled with AV1 only and
 * `sharp.format.heif.input.fileSuffix` is `['.avif']`. An iPhone photo simply
 * cannot be decoded by them. A globally-installed libvips built with libheif +
 * libde265 (Arch's `libvips` package is) does support it, and sharp will link
 * against it when built from source.
 *
 * Run as `postinstall`, because a plain `pnpm install` restores the prebuilt
 * binary and would silently take HEIC support away again.
 *
 * Best-effort by design: a machine without libvips headers or a C++ toolchain
 * keeps the prebuilt binary and everything except HEIC keeps working. sharp's
 * own loader falls back to `@img/sharp-linux-x64` when the from-source addon
 * can't be loaded (e.g. a server without libvips), so shipping this build in
 * `node_modules/` never breaks image processing outright.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// Resolve from the script's own location: a postinstall hook does not
// necessarily run with the repo root as its working directory.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const log = (msg) => console.log(`[sharp-heic] ${msg}`);

function heicSupported() {
	try {
		return require('sharp').format.heif.input.fileSuffix.includes('.heic');
	} catch {
		return false;
	}
}

/**
 * Root directory of an installed package. `require.resolve('<pkg>/package.json')`
 * is not usable here — sharp's `exports` map doesn't expose it — so resolve the
 * entry point and walk up to the manifest that names the package.
 */
function packageDir(name) {
	let dir;
	try {
		dir = path.dirname(require.resolve(name));
	} catch {
		return null;
	}
	while (dir !== path.dirname(dir)) {
		const manifest = path.join(dir, 'package.json');
		if (existsSync(manifest)) {
			try {
				if (JSON.parse(readFileSync(manifest, 'utf-8')).name === name) return dir;
			} catch { /* keep walking */ }
		}
		dir = path.dirname(dir);
	}
	return null;
}

function probe(cmd, args) {
	try {
		return execFileSync(cmd, args, {
			cwd: ROOT,
			encoding: 'utf-8',
			stdio: ['ignore', 'pipe', 'pipe']
		}).trim();
	} catch {
		return null;
	}
}

if (heicSupported()) {
	log('sharp already reads HEIC — nothing to do');
	process.exit(0);
}

const sharpDir = packageDir('sharp');
if (!sharpDir) {
	log('sharp is not installed — nothing to do');
	process.exit(0);
}
// `config.libvips` in sharp's package.json is the minimum it will link against.
const minimum =
	JSON.parse(readFileSync(path.join(sharpDir, 'package.json'), 'utf-8')).config?.libvips ?? '';
const globalVips = probe('pkg-config', ['--modversion', 'vips-cpp']);
if (!globalVips) {
	log(`no global libvips found (sharp wants ${minimum}) — keeping prebuilt binary, HEIC stays unsupported`);
	process.exit(0);
}

for (const dep of ['node-addon-api', 'node-gyp']) {
	if (!packageDir(dep)) {
		log(`${dep} not installed (production install?) — keeping prebuilt binary`);
		process.exit(0);
	}
}

log(`building sharp against global libvips ${globalVips} (wants ${minimum})`);
try {
	// Output is captured, not inherited: a wall of node-gyp noise on every
	// `pnpm install` hides the one line that matters.
	execFileSync('npm', ['run', 'build'], { cwd: sharpDir, stdio: ['ignore', 'ignore', 'pipe'] });
} catch {
	log('build failed — keeping prebuilt binary, HEIC stays unsupported');
	process.exit(0);
}

// A freshly built addon can't be verified from this process — the old binding
// is already loaded, and a probe spawned straight after the build has proven
// unreliable. `scripts/build-hikes.ts` re-checks at the point it matters and
// fails loudly there, so a bad build can't pass silently.
log(`built against libvips ${globalVips} — verify with:`);
log(`  node -p "require('sharp').format.heif.input.fileSuffix"`);
