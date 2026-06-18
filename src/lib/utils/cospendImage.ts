// Receipt images are stored as a bare filename; the URL is built here so the
// static location lives in one place. Taking the basename also tolerates older
// rows that stored a full path/URL, so display works during/after migration.

const RECEIPT_BASE = 'https://bocken.org/static/cospend/';

export function receiptUrl(image?: string | null): string {
	if (!image) return '';
	return RECEIPT_BASE + image.split('/').pop();
}
