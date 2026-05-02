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
	offline_banner_title: 'Save recipes for the kitchen',
	offline_banner_body: 'Download every recipe to your device so they stay available without internet — ideal while cooking.',
	offline_banner_action: 'Download recipes',
	dismiss: 'Dismiss',
	offline_data: 'Offline data',

	// Date picker
	select_date: 'Select date',
	today: 'Today',

	// Error view
	error_label: 'Error'
} as const satisfies Record<keyof typeof de, string>;
