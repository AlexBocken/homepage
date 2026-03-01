import { browser } from '$app/environment';

export type Theme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'theme';
const CYCLE: Theme[] = ['system', 'light', 'dark'];

function applyTheme(theme: Theme) {
	if (!browser) return;
	if (theme === 'system') {
		delete document.documentElement.dataset.theme;
	} else {
		document.documentElement.dataset.theme = theme;
	}
}

function createTheme() {
	let theme = $state<Theme>('system');

	if (browser) {
		const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
		if (stored && CYCLE.includes(stored)) {
			theme = stored;
		}
		applyTheme(theme);
	}

	return {
		get theme() { return theme; },

		cycle() {
			const next = CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length];
			theme = next;
			applyTheme(next);
			if (browser) {
				if (next === 'system') {
					localStorage.removeItem(STORAGE_KEY);
				} else {
					localStorage.setItem(STORAGE_KEY, next);
				}
			}
		}
	};
}

export const themeStore = createTheme();
