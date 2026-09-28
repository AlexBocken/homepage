// List bookkeeping shared by the recipe ingredient/instruction editors
// (CreateIngredientList, CreateStepList), next to the drag-and-drop in
// list_dnd.svelte.ts.
//
// The top-level array holds sections ({ name, <itemsKey>: [...] }) and
// base-recipe references ({ type: 'reference', <beforeKey>: [...],
// <afterKey>: [...] }). This class inserts and removes those entries, and
// tracks which reference list the item modal is adding to or editing. What an
// entry is (an ingredient object or a step string) and the modal fields stay
// with the component.

import { confirm } from '$lib/js/confirmDialog.svelte';

export type RefPosition = 'before' | 'after';

/** The component's strings; read: confirmDeleteReference, confirmDeleteList,
 *  actionDelete, actionCancel. */
type Texts = Record<string, string>;

type Keys = { items: string; before: string; after: string };

const IDLE = { active: false, list_index: -1, position: 'before' as RefPosition, editing: false, item_index: -1 };

export class RecipeListEditor {
	// Base recipe selector: open state and where the chosen reference goes.
	showSelector = $state(false);
	insertPosition = $state(0);

	// Which reference list the item modal adds to (or which entry it edits).
	addingToReference = $state({ ...IDLE });

	#keys: Keys;
	#get: () => any[];
	#set: (v: any[]) => void;
	#texts: () => Texts;

	constructor(keys: Keys, get: () => any[], set: (v: any[]) => void, texts: () => Texts) {
		this.#keys = keys;
		this.#get = get;
		this.#set = set;
		this.#texts = texts;
	}

	#commit() {
		this.#set(this.#get());
	}

	#confirmDelete(message: string) {
		const t = this.#texts();
		return confirm(message, { confirmText: t.actionDelete, cancelText: t.actionCancel });
	}

	openSelector(position: number) {
		this.insertPosition = position;
		this.showSelector = true;
	}

	/** Puts a new reference where the selector was opened and closes it. */
	insertReference(reference: object) {
		this.#get().splice(this.insertPosition, 0, reference);
		this.#commit();
		this.showSelector = false;
	}

	async removeReference(list_index: number) {
		if (await this.#confirmDelete(this.#texts().confirmDeleteReference)) {
			this.#get().splice(list_index, 1);
			this.#commit();
		}
	}

	/** Removes a section, asking first when it holds more than one entry. */
	async removeList(list_index: number) {
		if (this.#get()[list_index][this.#keys.items].length > 1) {
			if (!(await this.#confirmDelete(this.#texts().confirmDeleteList))) return;
		}
		this.#get().splice(list_index, 1);
		this.#commit();
	}

	/** Index of the section with this name, or -1. */
	sectionIndex(name: string) {
		return this.#get().findIndex((list) => list.name == name);
	}

	/** The before or after list of a reference. */
	referenceList(list_index: number, position: RefPosition): any[] {
		return this.#get()[list_index][position === 'before' ? this.#keys.before : this.#keys.after];
	}

	removeFromReference(list_index: number, position: RefPosition, item_index: number) {
		this.referenceList(list_index, position).splice(item_index, 1);
		this.#commit();
	}

	/** Starts adding to (item_index -1) or editing an entry of a reference list. */
	startReferenceEdit(list_index: number, position: RefPosition, item_index = -1) {
		this.addingToReference = { active: true, list_index, position, editing: item_index >= 0, item_index };
	}

	resetReferenceEdit() {
		this.addingToReference = { ...IDLE };
	}

	/** Stores the modal's entry in the reference list it was opened for. */
	saveReferenceEntry(entry: unknown) {
		const { list_index, position, editing, item_index } = this.addingToReference;
		if (editing) {
			this.referenceList(list_index, position)[item_index] = entry;
		} else {
			const ref = this.#get()[list_index];
			if (!ref[this.#keys.before]) ref[this.#keys.before] = [];
			if (!ref[this.#keys.after]) ref[this.#keys.after] = [];
			this.referenceList(list_index, position).push(entry);
		}
		this.#commit();
		this.resetReferenceEdit();
	}
}

/** Opens a modal dialog by id. */
export function showDialog(id: string) {
	(document.querySelector(`#${id}`) as HTMLDialogElement | null)?.showModal();
}

/** Closes a modal dialog by id on the next tick, once all bindings are updated. */
export function closeDialogDeferred(id: string) {
	const el = document.querySelector(`#${id}`) as HTMLDialogElement | null;
	if (el) setTimeout(() => el.close(), 0);
}
