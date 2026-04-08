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

export function confirm(message: string, options: ConfirmOptions = {}): Promise<boolean> {
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
