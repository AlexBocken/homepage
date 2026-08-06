interface ConfirmState {
	open: boolean;
	title: string;
	message: string;
	confirmText: string;
	cancelText: string;
	destructive: boolean;
	resolve: ((value: boolean) => void) | null;
}

let state = $state<ConfirmState>({
	open: false,
	title: '',
	message: '',
	confirmText: 'OK',
	cancelText: 'Cancel',
	destructive: false,
	resolve: null,
});

export function getConfirmDialog() {
	return {
		get open() { return state.open; },
		get title() { return state.title; },
		get message() { return state.message; },
		get confirmText() { return state.confirmText; },
		get cancelText() { return state.cancelText; },
		get destructive() { return state.destructive; },
		respond(value: boolean) {
			state.resolve?.(value);
			state = { ...state, open: false, resolve: null };
		}
	};
}

interface ConfirmOptions {
	title?: string;
	confirmText?: string;
	cancelText?: string;
	destructive?: boolean;
}

/**
 * Ask the user to confirm something.
 *
 * Always pass `confirmText`: the fallbacks below are hardcoded English and name no
 * action, so a German page ends up asking "Eintrag löschen?" under an "OK" button.
 * The label should be the verb for what happens — Delete, Remove, Discard — because
 * that is what a hurried reader actually reads. In dev, omitting it warns.
 */
export function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
	if (import.meta.env.DEV && !options.confirmText) {
		console.warn(`[confirm] no confirmText — falling back to "OK": ${message}`);
	}
	return new Promise((resolve) => {
		state = {
			open: true,
			message,
			title: options.title ?? '',
			confirmText: options.confirmText ?? 'OK',
			cancelText: options.cancelText ?? 'Cancel',
			destructive: options.destructive ?? true,
			resolve,
		};
	});
}
