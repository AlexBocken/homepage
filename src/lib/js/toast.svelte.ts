interface ToastAction {
	label: string;
	run: () => void;
}

interface Toast {
	id: number;
	message: string;
	type: 'error' | 'success' | 'info';
	/** One optional action, e.g. "Undo"; the toast closes when it is used. */
	action?: ToastAction;
}

interface ToastOptions {
	action?: ToastAction;
	/** Milliseconds; a toast with an action stays a little longer by default. */
	duration?: number;
}

let nextId = 0;
let toasts = $state<Toast[]>([]);

export function getToasts() {
	return {
		get items() { return toasts; },
		remove(id: number) {
			toasts = toasts.filter(t => t.id !== id);
		}
	};
}

function add(message: string, type: Toast['type'], duration: number, opts: ToastOptions = {}) {
	const id = nextId++;
	toasts = [...toasts, { id, message, type, action: opts.action }];
	setTimeout(() => {
		toasts = toasts.filter(t => t.id !== id);
	}, opts.duration ?? (opts.action ? Math.max(duration, 5000) : duration));
}

export const toast = {
	error: (msg: string, opts?: ToastOptions) => add(msg, 'error', 6000, opts),
	success: (msg: string, opts?: ToastOptions) => add(msg, 'success', 3000, opts),
	info: (msg: string, opts?: ToastOptions) => add(msg, 'info', 4000, opts),
};
