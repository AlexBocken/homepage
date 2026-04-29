export type Language = 'de' | 'en';

function createLanguage() {
	let value = $state<Language>('de');

	return {
		get value() { return value; },
		set: (v: Language) => { value = v; }
	};
}

export const languageStore = createLanguage();
