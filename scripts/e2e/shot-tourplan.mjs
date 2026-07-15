import { chromium } from '@playwright/test';
const b = await chromium.launch();
const out = process.argv[2] || 'tourplan';
const theme = process.argv[3] || 'light';
for (const w of [420, 900]) {
	const p = await b.newPage({ viewport: { width: w, height: 1400 }, deviceScaleFactor: 2 });
	if (theme === 'dark') await p.emulateMedia({ colorScheme: 'dark' });
	await p.goto('http://localhost:5199/tourplan', { waitUntil: 'networkidle' });
	await p.waitForTimeout(600);
	await p.screenshot({ path: `/tmp/claude-1000/-home-alex--local-src-homepage-new/9033488a-1990-4903-a7b9-f0ee59c4f4c3/scratchpad/${out}-${w}-${theme}.png`, fullPage: true });
	await p.close();
}
await b.close();
console.log('shot', out, theme);
