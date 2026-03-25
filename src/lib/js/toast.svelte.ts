interface Toast {
	id: number;
	message: string;
	type: 'error' | 'success' | 'info';
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

function add(message: string, type: Toast['type'], duration = 5000) {
	const id = nextId++;
	toasts = [...toasts, { id, message, type }];
	setTimeout(() => {
		toasts = toasts.filter(t => t.id !== id);
	}, duration);
}

export const toast = {
	error: (msg: string) => add(msg, 'error', 6000),
	success: (msg: string) => add(msg, 'success', 3000),
	info: (msg: string) => add(msg, 'info', 4000),
};
