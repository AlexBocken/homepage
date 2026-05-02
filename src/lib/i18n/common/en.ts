import type { de } from './de';

export const en = {
	// Auth / user header
	login: 'Login',

	// (main) homepage
	welcome: 'Welcome to bocken.org',
	pages: 'Pages',
	recipes: 'Recipes',
	family_photos: 'Family Photos',
	video_conferences: 'Video Conferences',
	search_engine: 'Search Engine',
	shopping: 'Shopping',
	family_tree: 'Family Tree',
	faith: 'Faith',
	documents: 'Documents',
	audiobooks_podcasts: 'Audiobooks & Podcasts',
	nutrition: 'Nutrition',
	tasks: 'Tasks',

	// Offline sync button
	sync_for_offline: 'Save for offline',
	syncing: 'Syncing…',
	offline_ready: 'Offline ready',
	last_sync: 'Last sync',
	recipes_word: 'recipes',
	sync_now: 'Sync now',
	clear_offline_data: 'Clear offline data',

	// Date picker
	select_date: 'Select date',
	today: 'Today',

	// Error view
	error_label: 'Error'
} as const satisfies Record<keyof typeof de, string>;
