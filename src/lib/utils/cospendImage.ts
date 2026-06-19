// Receipt images are stored as a bare filename; the URL is built here so the
// static location lives in one place. Taking the basename also tolerates older
// rows that stored a full path/URL, so display works during/after migration.

const RECEIPT_BASE = 'https://bocken.org/static/cospend/';

export function receiptUrl(image?: string | null): string {
	if (!image) return '';
	return RECEIPT_BASE + image.split('/').pop();
}

// Downscaled thumbnail (cospend/thumb/<same filename>), used for list views.
// Falls back to the full image on the consumer side if a thumb is missing.
export function receiptThumbUrl(image?: string | null): string {
	if (!image) return '';
	return RECEIPT_BASE + 'thumb/' + image.split('/').pop();
}
