/**
 * Downloads all exercise images and videos from the ExerciseDB CDN.
 *
 * Run with: pnpm exec vite-node scripts/download-exercise-media.ts
 *
 * Reads: src/lib/data/exercisedb-raw.json
 * Outputs: static/fitness/exercises/<exerciseId>/
 *   - images: 360p.jpg, 480p.jpg, 720p.jpg, 1080p.jpg
 *   - video: video.mp4
 *
 * Resumes automatically — skips files that already exist on disk.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, extname } from 'path';

const RAW_PATH = resolve('src/lib/data/exercisedb-raw.json');
const OUT_DIR = resolve('static/fitness/exercises');
const CONCURRENCY = 10;

interface DownloadTask {
	url: string;
	dest: string;
}

function sleep(ms: number) {
	return new Promise(r => setTimeout(r, ms));
}

async function download(url: string, dest: string, retries = 3): Promise<boolean> {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
			const buf = Buffer.from(await res.arrayBuffer());
			writeFileSync(dest, buf);
			return true;
		} catch (err: any) {
			if (attempt === retries) {
				console.error(`  FAILED ${url}: ${err.message}`);
				return false;
			}
			await sleep(1000 * attempt);
		}
	}
	return false;
}

async function runQueue(tasks: DownloadTask[]) {
	let done = 0;
	let failed = 0;
	const total = tasks.length;

	async function worker() {
		while (tasks.length > 0) {
			const task = tasks.shift()!;
			const ok = await download(task.url, task.dest);
			if (!ok) failed++;
			done++;
			if (done % 50 === 0 || done === total) {
				console.log(`  ${done}/${total} downloaded${failed ? ` (${failed} failed)` : ''}`);
			}
		}
	}

	const workers = Array.from({ length: CONCURRENCY }, () => worker());
	await Promise.all(workers);
	return { done, failed };
}

async function main() {
	console.log('=== Exercise Media Downloader ===\n');

	if (!existsSync(RAW_PATH)) {
		console.error(`Missing ${RAW_PATH} — run scrape-exercises.ts first`);
		process.exit(1);
	}

	const data = JSON.parse(readFileSync(RAW_PATH, 'utf-8'));
	const exercises: any[] = data.exercises;
	console.log(`${exercises.length} exercises in raw data\n`);

	const tasks: DownloadTask[] = [];

	for (const ex of exercises) {
		const dir = resolve(OUT_DIR, ex.exerciseId);
		mkdirSync(dir, { recursive: true });

		// Multi-resolution images
		if (ex.imageUrls) {
			for (const [res, url] of Object.entries(ex.imageUrls as Record<string, string>)) {
				const ext = extname(new URL(url).pathname) || '.jpg';
				const dest = resolve(dir, `${res}${ext}`);
				if (!existsSync(dest)) tasks.push({ url, dest });
			}
		}

		// Video
		if (ex.videoUrl) {
			const dest = resolve(dir, 'video.mp4');
			if (!existsSync(dest)) tasks.push({ url: ex.videoUrl, dest });
		}
	}

	if (tasks.length === 0) {
		console.log('All media already downloaded!');
		return;
	}

	console.log(`${tasks.length} files to download (skipping existing)\n`);
	const { done, failed } = await runQueue(tasks);
	console.log(`\nDone! ${done - failed} downloaded, ${failed} failed.`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
