// Native HTML5 drag-and-drop helper shared by the recipe ingredient/instruction
// editors. Mirrors the food-log DnD on /fitness/nutrition: items can be dragged
// between lists (and reordered within one), and whole lists can be reordered
// among the top-level array.
//
// The top-level array holds section objects ({ name, <itemsKey>: [...] }) and
// base-recipe references ({ type: 'reference', ... }). Items can only be dropped
// into sections; references are never item-drop targets. List reordering applies
// to every top-level entry (sections and references alike).

type Src =
	| { kind: 'item'; list: number; item: number }
	| { kind: 'list'; list: number };

export class ListDnd {
	src = $state<Src | null>(null);

	// Item drop target
	overList = $state(-1); // section index currently hovered
	overRow = $state(-1); // hovered row index within that section (-1 => append)
	overPos = $state<'before' | 'after'>('before');

	// List-reorder drop target
	overHeader = $state(-1);
	headerPos = $state<'before' | 'after'>('before');

	#key: string;
	#get: () => any[];
	#set: (v: any[]) => void;

	constructor(itemsKey: string, get: () => any[], set: (v: any[]) => void) {
		this.#key = itemsKey;
		this.#get = get;
		this.#set = set;
	}

	get draggingItem() {
		return this.src?.kind === 'item';
	}
	get draggingList() {
		return this.src?.kind === 'list';
	}

	isItemDragSource(list: number, item: number) {
		return this.src?.kind === 'item' && this.src.list === list && this.src.item === item;
	}
	isListDragSource(list: number) {
		return this.src?.kind === 'list' && this.src.list === list;
	}

	reset() {
		this.src = null;
		this.overList = -1;
		this.overRow = -1;
		this.overHeader = -1;
	}

	// ---- item drag ----
	itemDragStart(e: DragEvent, list: number, item: number) {
		this.src = { kind: 'item', list, item };
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', 'item');
			// Drag the whole row, not just the little handle.
			const card = (e.currentTarget as HTMLElement).closest('[data-dnd-item]');
			if (card) e.dataTransfer.setDragImage(card as HTMLElement, 20, 20);
		}
	}

	itemDragOverRow(e: DragEvent, list: number, item: number) {
		if (this.src?.kind !== 'item') return;
		e.preventDefault();
		e.stopPropagation(); // don't let the section's append handler override us
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const before = e.clientY - rect.top < rect.height / 2;
		this.overList = list;
		this.overRow = item;
		this.overPos = before ? 'before' : 'after';
	}

	sectionDragOver(e: DragEvent, list: number) {
		if (this.src?.kind !== 'item') return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		this.overList = list;
		this.overRow = -1; // append to end
	}

	sectionDragLeave(e: DragEvent, list: number) {
		const related = e.relatedTarget as Element | null;
		const target = e.currentTarget as Element;
		if (!related || !target.contains(related)) {
			if (this.overList === list) {
				this.overList = -1;
				this.overRow = -1;
			}
		}
	}

	itemDrop(e: DragEvent) {
		e.preventDefault();
		const src = this.src;
		const arr = this.#get();
		if (src?.kind === 'item' && this.overList >= 0) {
			const insertion =
				this.overRow === -1
					? arr[this.overList]?.[this.#key]?.length ?? 0
					: this.overPos === 'before'
						? this.overRow
						: this.overRow + 1;
			this.#moveItem(src.list, src.item, this.overList, insertion);
		}
		this.reset();
	}

	#moveItem(fromL: number, fromI: number, toL: number, toIndex: number) {
		const arr = this.#get();
		const fromArr = arr[fromL]?.[this.#key];
		const toArr = arr[toL]?.[this.#key];
		if (!fromArr || !toArr) return;
		const [moved] = fromArr.splice(fromI, 1);
		let insert = toIndex;
		if (fromL === toL && fromI < insert) insert -= 1;
		if (insert < 0) insert = 0;
		if (insert > toArr.length) insert = toArr.length;
		toArr.splice(insert, 0, moved);
		this.#set(arr);
	}

	// ---- list drag ----
	listDragStart(e: DragEvent, list: number) {
		this.src = { kind: 'list', list };
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', 'list');
			// If the handle sits inside a dedicated card, drag the whole card.
			const card = (e.currentTarget as HTMLElement).closest('[data-dnd-list]');
			if (card) e.dataTransfer.setDragImage(card as HTMLElement, 20, 20);
		}
	}

	headerDragOver(e: DragEvent, list: number) {
		if (this.src?.kind !== 'list') return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const before = e.clientY - rect.top < rect.height / 2;
		this.overHeader = list;
		this.headerPos = before ? 'before' : 'after';
	}

	headerDragLeave(e: DragEvent, list: number) {
		const related = e.relatedTarget as Element | null;
		const target = e.currentTarget as Element;
		if (!related || !target.contains(related)) {
			if (this.overHeader === list) this.overHeader = -1;
		}
	}

	headerDrop(e: DragEvent, list: number) {
		e.preventDefault();
		const src = this.src;
		if (src?.kind === 'list') {
			const insertion = this.headerPos === 'before' ? list : list + 1;
			this.#moveList(src.list, insertion);
		}
		this.reset();
	}

	#moveList(from: number, toIndex: number) {
		const arr = this.#get();
		if (from < 0 || from >= arr.length) return;
		const [moved] = arr.splice(from, 1);
		let insert = toIndex;
		if (from < insert) insert -= 1;
		if (insert < 0) insert = 0;
		if (insert > arr.length) insert = arr.length;
		arr.splice(insert, 0, moved);
		this.#set(arr);
	}

	dragEnd() {
		this.reset();
	}
}
