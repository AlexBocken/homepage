/** Cospend route i18n — slug mappings and UI translations */

/** Detect language from a cospend path by checking the root segment */
export function detectCospendLang(pathname: string): 'en' | 'de' {
	const first = pathname.split('/').filter(Boolean)[0];
	return first === 'expenses' ? 'en' : 'de';
}

/** Convert a cospend path to the target language */
export function convertCospendPath(pathname: string, targetLang: 'en' | 'de'): string {
	const targetRoot = targetLang === 'en' ? 'expenses' : 'cospend';
	return pathname.replace(/^\/(cospend|expenses)/, `/${targetRoot}`);
}

/** Get the root slug for a given language */
export function cospendRoot(lang: 'en' | 'de'): string {
	return lang === 'en' ? 'expenses' : 'cospend';
}

/** Get translated nav labels */
export function cospendLabels(lang: 'en' | 'de') {
	return {
		dash: lang === 'en' ? 'Dashboard' : 'Dashboard',
		list: lang === 'en' ? 'List' : 'Liste',
		payments: lang === 'en' ? 'All Payments' : 'Alle Zahlungen',
		recurring: lang === 'en' ? 'Recurring' : 'Wiederkehrend'
	};
}

type Translations = Record<string, Record<string, string>>;

const translations: Translations = {
	// Page titles
	cospend_title: { en: 'Expenses - Expense Sharing', de: 'Cospend - Ausgabenteilung' },
	all_payments_title: { en: 'All Payments', de: 'Alle Zahlungen' },
	settle_title: { en: 'Settle Debts', de: 'Schulden begleichen' },
	recurring_title: { en: 'Recurring Payments', de: 'Wiederkehrende Zahlungen' },
	shopping_list_title: { en: 'Shopping List', de: 'Einkaufsliste' },
	payment_details: { en: 'Payment Details', de: 'Zahlungsdetails' },

	// Dashboard
	cospend: { en: 'Expenses', de: 'Cospend' },
	settle_debts: { en: 'Settle Debts', de: 'Schulden begleichen' },
	monthly_expenses_chart: { en: 'Monthly Expenses by Category', de: 'Monatliche Ausgaben nach Kategorie' },
	loading_monthly: { en: 'Loading monthly expenses chart...', de: 'Monatliche Ausgaben werden geladen...' },
	loading_recent: { en: 'Loading recent activity...', de: 'Letzte Aktivitäten werden geladen...' },
	recent_activity: { en: 'Recent Activity', de: 'Letzte Aktivität' },
	clear_filter: { en: 'Clear filter', de: 'Filter löschen' },
	no_recent_in: { en: 'No recent activity in', de: 'Keine Aktivität in' },
	paid_by: { en: 'Paid by', de: 'Bezahlt von' },
	payment: { en: 'Payment', de: 'Zahlung' },

	// All Payments page
	loading_payments: { en: 'Loading payments...', de: 'Zahlungen werden geladen...' },
	no_payments_yet: { en: 'No payments yet', de: 'Noch keine Zahlungen' },
	start_first_expense: { en: 'Start by adding your first shared expense', de: 'Füge deine erste geteilte Ausgabe hinzu' },
	add_first_payment: { en: 'Add Your First Payment', de: 'Erste Zahlung hinzufügen' },
	settlement: { en: 'Settlement', de: 'Ausgleich' },
	split_details: { en: 'Split Details', de: 'Aufteilung' },
	owes: { en: 'owes', de: 'schuldet' },
	owed: { en: 'owed', de: 'bekommt' },
	even: { en: 'even', de: 'ausgeglichen' },
	previous: { en: '← Previous', de: '← Zurück' },
	next: { en: 'Next →', de: 'Weiter →' },
	load_more: { en: 'Load More', de: 'Mehr laden' },
	loading_ellipsis: { en: 'Loading...', de: 'Laden...' },
	delete_payment_confirm: { en: 'Are you sure you want to delete this payment?', de: 'Diese Zahlung wirklich löschen?' },

	// Payment detail labels
	date: { en: 'Date:', de: 'Datum:' },
	paid_by_label: { en: 'Paid by:', de: 'Bezahlt von:' },
	created_by: { en: 'Created by:', de: 'Erstellt von:' },
	category_label: { en: 'Category:', de: 'Kategorie:' },
	split_method_label: { en: 'Split method:', de: 'Aufteilungsart:' },
	description: { en: 'Description', de: 'Beschreibung' },
	exchange_rate: { en: 'Exchange rate', de: 'Wechselkurs' },
	receipt: { en: 'Receipt', de: 'Beleg' },
	receipt_image: { en: 'Receipt Image', de: 'Belegbild' },
	remove_image: { en: 'Remove Image', de: 'Bild entfernen' },
	replace_image: { en: 'Replace Image', de: 'Bild ersetzen' },
	upload_receipt: { en: 'Upload Receipt Image', de: 'Beleg hochladen' },
	uploading_image: { en: 'Uploading image...', de: 'Bild wird hochgeladen...' },
	file_too_large: { en: 'File size must be less than 5MB', de: 'Dateigrösse muss unter 5MB sein' },
	invalid_image: { en: 'Please select a valid image file (JPEG, PNG, WebP)', de: 'Bitte eine gültige Bilddatei wählen (JPEG, PNG, WebP)' },
	you: { en: 'You', de: 'Du' },
	close: { en: 'Close', de: 'Schliessen' },

	// Split descriptions
	no_splits: { en: 'No splits', de: 'Keine Aufteilung' },
	split_equal: { en: 'Split equally among', de: 'Gleichmässig aufgeteilt auf' },
	paid_full_by: { en: 'Paid in full by', de: 'Vollständig bezahlt von' },
	personal_equal: { en: 'Personal amounts + equal split among', de: 'Persönliche Beträge + Gleichverteilung auf' },
	custom_split: { en: 'Custom split among', de: 'Individuelle Aufteilung auf' },
	people: { en: 'people', de: 'Personen' },

	// Settle page
	settle_subtitle: { en: 'Record payments to settle outstanding debts between users', de: 'Zahlungen erfassen, um offene Schulden auszugleichen' },
	loading_debts: { en: 'Loading debt information...', de: 'Schuldeninformationen werden geladen...' },
	all_settled: { en: 'All Settled!', de: 'Alles beglichen!' },
	no_debts_msg: { en: 'No outstanding debts to settle. Everyone is even!', de: 'Keine offenen Schulden. Alle sind ausgeglichen!' },
	back_to_dashboard: { en: 'Back to Dashboard', de: 'Zurück zum Dashboard' },
	available_settlements: { en: 'Available Settlements', de: 'Mögliche Ausgleiche' },
	money_owed_to_you: { en: "Money You're Owed", de: 'Geld, das du bekommst' },
	owes_you: { en: 'owes you', de: 'schuldet dir' },
	receive_payment: { en: 'Receive Payment', de: 'Zahlung empfangen' },
	money_you_owe: { en: 'Money You Owe', de: 'Geld, das du schuldest' },
	you_owe: { en: 'you owe', de: 'du schuldest' },
	make_payment: { en: 'Make Payment', de: 'Zahlung leisten' },
	settlement_details: { en: 'Settlement Details', de: 'Ausgleichsdetails' },
	settlement_amount: { en: 'Settlement Amount', de: 'Ausgleichsbetrag' },
	record_settlement: { en: 'Record Settlement', de: 'Ausgleich erfassen' },
	recording_settlement: { en: 'Recording Settlement...', de: 'Ausgleich wird erfasst...' },
	cancel: { en: 'Cancel', de: 'Abbrechen' },
	settlement_type: { en: 'Settlement Type', de: 'Ausgleichsart' },
	select_settlement: { en: 'Select settlement type', de: 'Ausgleichsart wählen' },
	receive_from: { en: 'Receive', de: 'Empfangen' },
	from: { en: 'from', de: 'von' },
	pay_to: { en: 'Pay', de: 'Zahlen' },
	to: { en: 'to', de: 'an' },
	from_user: { en: 'From User', de: 'Von Benutzer' },
	select_payer: { en: 'Select payer', de: 'Zahler wählen' },
	to_user: { en: 'To User', de: 'An Benutzer' },
	select_recipient: { en: 'Select recipient', de: 'Empfänger wählen' },
	settlement_amount_chf: { en: 'Settlement Amount (CHF)', de: 'Ausgleichsbetrag (CHF)' },
	error_select_settlement: { en: 'Please select a settlement and enter an amount', de: 'Bitte einen Ausgleich wählen und Betrag eingeben' },
	error_valid_amount: { en: 'Please enter a valid positive amount', de: 'Bitte einen gültigen positiven Betrag eingeben' },
	settlement_payment: { en: 'Settlement Payment', de: 'Ausgleichszahlung' },

	// Recurring page
	recurring_subtitle: { en: 'Automate your regular shared expenses', de: 'Automatisiere deine regelmässigen geteilten Ausgaben' },
	show_active_only: { en: 'Show active only', de: 'Nur aktive anzeigen' },
	loading_recurring: { en: 'Loading recurring payments...', de: 'Wiederkehrende Zahlungen werden geladen...' },
	no_recurring: { en: 'No recurring payments found', de: 'Keine wiederkehrenden Zahlungen gefunden' },
	no_recurring_desc: { en: 'Create your first recurring payment to automate regular expenses like rent, utilities, or subscriptions.', de: 'Erstelle deine erste wiederkehrende Zahlung für regelmässige Ausgaben wie Miete, Nebenkosten oder Abos.' },
	active: { en: 'Active', de: 'Aktiv' },
	inactive: { en: 'Inactive', de: 'Inaktiv' },
	frequency: { en: 'Frequency:', de: 'Häufigkeit:' },
	next_execution: { en: 'Next execution:', de: 'Nächste Ausführung:' },
	last_executed: { en: 'Last executed:', de: 'Zuletzt ausgeführt:' },
	ends: { en: 'Ends:', de: 'Endet:' },
	split_between: { en: 'Split between:', de: 'Aufgeteilt zwischen:' },
	gets: { en: 'gets', de: 'bekommt' },
	edit: { en: 'Edit', de: 'Bearbeiten' },
	pause: { en: 'Pause', de: 'Pausieren' },
	activate: { en: 'Activate', de: 'Aktivieren' },
	delete_: { en: 'Delete', de: 'Löschen' },
	delete_recurring_confirm: { en: 'Are you sure you want to delete the recurring payment', de: 'Wiederkehrende Zahlung wirklich löschen' },

	// Shopping list
	items_done: { en: 'done', de: 'erledigt' },
	add_item_placeholder: { en: 'Add item...', de: 'Artikel hinzufügen...' },
	empty_list: { en: 'The shopping list is empty', de: 'Die Einkaufsliste ist leer' },
	clear_checked: { en: 'Remove checked', de: 'Erledigte entfernen' },
	share: { en: 'Share', de: 'Teilen' },

	// Share modal
	shared_links: { en: 'Shared Links', de: 'Geteilte Links' },
	share_desc: { en: 'Anyone with an active link can edit the shopping list.', de: 'Jeder mit einem aktiven Link kann die Einkaufsliste bearbeiten.' },
	loading: { en: 'Loading...', de: 'Laden...' },
	no_active_links: { en: 'No active links.', de: 'Keine aktiven Links.' },
	remaining: { en: 'remaining', de: 'noch' },
	change: { en: 'Change', de: 'Ändern' },
	copy_link: { en: 'Copy link', de: 'Link kopieren' },
	create_new_link: { en: 'Create new link', de: 'Neuen Link erstellen' },
	copied: { en: 'Copied', de: 'Kopiert' },
	expired: { en: 'expired', de: 'abgelaufen' },

	// TTL
	ttl_1h: { en: '1 hour', de: '1 Stunde' },
	ttl_6h: { en: '6 hours', de: '6 Stunden' },
	ttl_24h: { en: '24 hours', de: '24 Stunden' },
	ttl_3d: { en: '3 days', de: '3 Tage' },
	ttl_7d: { en: '7 days', de: '7 Tage' },

	// Edit modal
	kategorie: { en: 'Category', de: 'Kategorie' },
	icon: { en: 'Icon', de: 'Icon' },
	search_icon: { en: 'Search icon...', de: 'Icon suchen...' },
	save: { en: 'Save', de: 'Speichern' },
	saving: { en: 'Saving...', de: 'Speichern...' },
	edit_name: { en: 'Name', de: 'Name' },
	edit_qty: { en: 'Amount', de: 'Menge' },
	edit_qty_ph: { en: 'e.g. 3x, 500g, 1L', de: 'z.B. 3x, 500g, 1L' },

	// EnhancedBalance
	your_balance: { en: 'Your Balance', de: 'Dein Saldo' },
	you_are_owed: { en: 'You are owed', de: 'Du bekommst' },
	you_owe_balance: { en: 'You owe', de: 'Du schuldest' },
	all_even: { en: "You're all even", de: 'Alles ausgeglichen' },
	owes_you_balance: { en: 'owes you', de: 'schuldet dir' },
	you_owe_user: { en: 'you owe', de: 'du schuldest' },
	transaction: { en: 'transaction', de: 'Transaktion' },
	transactions: { en: 'transactions', de: 'Transaktionen' },

	// DebtBreakdown
	debt_overview: { en: 'Debt Overview', de: 'Schuldenübersicht' },
	loading_debt_breakdown: { en: 'Loading debt breakdown...', de: 'Schuldenübersicht wird geladen...' },
	who_owes_you: { en: 'Who owes you', de: 'Wer dir schuldet' },
	you_owe_section: { en: 'You owe', de: 'Du schuldest' },
	total: { en: 'Total', de: 'Gesamt' },

	// Frequency descriptions (recurring payments)
	freq_every_day: { en: 'Every day', de: 'Jeden Tag' },
	freq_every_week: { en: 'Every week', de: 'Jede Woche' },
	freq_every_month: { en: 'Every month', de: 'Jeden Monat' },
	freq_custom: { en: 'Custom', de: 'Benutzerdefiniert' },
	freq_unknown: { en: 'Unknown frequency', de: 'Unbekannte Häufigkeit' },

	// Next execution
	today_at: { en: 'Today at', de: 'Heute um' },
	tomorrow_at: { en: 'Tomorrow at', de: 'Morgen um' },
	in_days_at: { en: 'In {days} days at', de: 'In {days} Tagen um' },

	// UsersList
	split_between_users: { en: 'Split Between Users', de: 'Aufteilen zwischen' },
	predefined_note: { en: 'Splitting between predefined users:', de: 'Aufteilung zwischen vordefinierten Benutzern:' },
	you: { en: 'You', de: 'Du' },
	remove: { en: 'Remove', de: 'Entfernen' },
	add_user_placeholder: { en: 'Add user...', de: 'Benutzer hinzufügen...' },
	add_user: { en: 'Add User', de: 'Benutzer hinzufügen' },

	// SplitMethodSelector
	split_method: { en: 'Split Method', de: 'Aufteilungsmethode' },
	how_split: { en: 'How should this payment be split?', de: 'Wie soll diese Zahlung aufgeteilt werden?' },
	split_5050: { en: 'Split 50/50', de: '50/50 teilen' },
	equal_split: { en: 'Equal Split', de: 'Gleichmässig' },
	personal_equal_split: { en: 'Personal + Equal Split', de: 'Persönlich + Gleichmässig' },
	custom_proportions: { en: 'Custom Proportions', de: 'Individuelle Anteile' },
	custom_split_amounts: { en: 'Custom Split Amounts', de: 'Individuelle Beträge' },
	personal_amounts: { en: 'Personal Amounts', de: 'Persönliche Beträge' },
	personal_amounts_desc: { en: 'Enter personal amounts for each user. The remainder will be split equally.', de: 'Persönliche Beträge pro Benutzer eingeben. Der Rest wird gleichmässig aufgeteilt.' },
	total_personal: { en: 'Total Personal', de: 'Persönlich gesamt' },
	remainder_to_split: { en: 'Remainder to Split', de: 'Restbetrag zum Aufteilen' },
	personal_exceeds_total: { en: 'Warning: Personal amounts exceed total payment amount!', de: 'Warnung: Persönliche Beträge übersteigen den Gesamtbetrag!' },
	split_preview: { en: 'Split Preview', de: 'Aufteilungsvorschau' },
	owes: { en: 'owes', de: 'schuldet' },
	is_owed: { en: 'is owed', de: 'bekommt' },
	error_prefix: { en: 'Error', de: 'Fehler' },

	// Payment categories (for expense categories, not shopping)
	cat_groceries: { en: 'Groceries', de: 'Lebensmittel' },
	cat_shopping: { en: 'Shopping', de: 'Einkauf' },
	cat_travel: { en: 'Travel', de: 'Reise' },
	cat_restaurant: { en: 'Restaurant', de: 'Restaurant' },
	cat_utilities: { en: 'Utilities', de: 'Nebenkosten' },
	cat_fun: { en: 'Fun', de: 'Freizeit' },
	cat_settlement: { en: 'Settlement', de: 'Ausgleich' },

	// Payment add/edit forms
	add_payment_title: { en: 'Add New Payment', de: 'Neue Zahlung' },
	add_payment_subtitle: { en: 'Create a new shared expense or recurring payment', de: 'Neue geteilte Ausgabe oder wiederkehrende Zahlung erstellen' },
	edit_payment_title: { en: 'Edit Payment', de: 'Zahlung bearbeiten' },
	edit_payment_subtitle: { en: 'Modify payment details and receipt image', de: 'Zahlungsdetails und Beleg bearbeiten' },
	edit_recurring_title: { en: 'Edit Recurring Payment', de: 'Wiederkehrende Zahlung bearbeiten' },
	payment_details_section: { en: 'Payment Details', de: 'Zahlungsdetails' },
	title_label: { en: 'Title *', de: 'Titel *' },
	title_placeholder: { en: 'e.g., Dinner at restaurant', de: 'z.B. Abendessen im Restaurant' },
	description_label: { en: 'Description', de: 'Beschreibung' },
	description_placeholder: { en: 'Additional details...', de: 'Weitere Details...' },
	category_star: { en: 'Category *', de: 'Kategorie *' },
	amount_label: { en: 'Amount *', de: 'Betrag *' },
	payment_date: { en: 'Payment Date', de: 'Zahlungsdatum' },
	paid_by_form: { en: 'Paid by', de: 'Bezahlt von' },
	make_recurring: { en: 'Make this a recurring payment', de: 'Als wiederkehrende Zahlung einrichten' },
	recurring_section: { en: 'Recurring Payment', de: 'Wiederkehrende Zahlung' },
	recurring_schedule: { en: 'Recurring Schedule', de: 'Wiederkehrender Zeitplan' },
	frequency_label: { en: 'Frequency *', de: 'Häufigkeit *' },
	freq_daily: { en: 'Daily', de: 'Täglich' },
	freq_weekly: { en: 'Weekly', de: 'Wöchentlich' },
	freq_monthly: { en: 'Monthly', de: 'Monatlich' },
	freq_quarterly: { en: 'Quarterly', de: 'Vierteljährlich' },
	freq_yearly: { en: 'Yearly', de: 'Jährlich' },
	freq_custom: { en: 'Custom (Cron)', de: 'Benutzerdefiniert (Cron)' },
	start_date: { en: 'Start Date *', de: 'Startdatum *' },
	end_date_optional: { en: 'End Date (optional)', de: 'Enddatum (optional)' },
	end_date_hint: { en: 'Leave empty for indefinite recurring', de: 'Leer lassen für unbefristete Wiederholung' },
	next_execution_preview: { en: 'Next Execution', de: 'Nächste Ausführung' },
	status_label: { en: 'Status', de: 'Status' },
	create_payment: { en: 'Create payment', de: 'Zahlung erstellen' },
	save_changes: { en: 'Save changes', de: 'Änderungen speichern' },
	delete_payment: { en: 'Delete Payment', de: 'Zahlung löschen' },
	deleting: { en: 'Deleting...', de: 'Löschen...' },

	// Split configuration (edit page)
	split_config: { en: 'Split Configuration', de: 'Aufteilungskonfiguration' },
	split_method_form: { en: 'Split Method:', de: 'Aufteilungsart:' },
	equal_split: { en: 'Equal Split', de: 'Gleichmässige Aufteilung' },
	personal_equal_split: { en: 'Personal + Equal Split', de: 'Persönliche Beträge + Gleichverteilung' },
	custom_proportions: { en: 'Custom Proportions', de: 'Individuelle Anteile' },
	personal_amounts: { en: 'Personal Amounts', de: 'Persönliche Beträge' },
	personal_amounts_desc: { en: 'Enter personal amounts for each user. The remainder will be split equally.', de: 'Persönliche Beträge für jeden Benutzer eingeben. Der Rest wird gleichmässig aufgeteilt.' },
	total_personal: { en: 'Total Personal', de: 'Persönliche Summe' },
	remainder_to_split: { en: 'Remainder to Split', de: 'Rest zum Aufteilen' },
	personal_exceeds: { en: 'Personal amounts exceed total payment amount!', de: 'Persönliche Beträge übersteigen den Gesamtbetrag!' },
	split_preview: { en: 'Split Preview', de: 'Aufteilungsvorschau' },

	// Currency conversion
	conversion_hint: { en: 'Amount will be converted to CHF using exchange rates for the payment date', de: 'Betrag wird anhand des Wechselkurses am Zahlungstag in CHF umgerechnet' },
	fetching_rate: { en: 'Fetching exchange rate...', de: 'Wechselkurs wird abgerufen...' },
	exchange_rate_date: { en: 'Exchange rate will be fetched for this date', de: 'Wechselkurs wird für dieses Datum abgerufen' },

	// SplitMethodSelector
	paid_in_full: { en: 'Paid in Full', de: 'Vollständig bezahlt' },
	paid_in_full_for: { en: 'Paid in Full for', de: 'Vollständig bezahlt für' },
	paid_in_full_by_you: { en: 'Paid in Full by You', de: 'Vollständig von dir bezahlt' },
	paid_in_full_by: { en: 'Paid in Full by', de: 'Vollständig bezahlt von' },

	// Shopping category names (for EN display)
	cat_fruits_veg: { en: 'Fruits & Vegetables', de: 'Obst & Gemüse' },
	cat_meat_fish: { en: 'Meat & Fish', de: 'Fleisch & Fisch' },
	cat_dairy: { en: 'Dairy', de: 'Milchprodukte' },
	cat_bakery: { en: 'Bread & Bakery', de: 'Brot & Backwaren' },
	cat_grains: { en: 'Pasta, Rice & Grains', de: 'Pasta, Reis & Getreide' },
	cat_spices: { en: 'Spices & Sauces', de: 'Gewürze & Saucen' },
	cat_drinks: { en: 'Beverages', de: 'Getränke' },
	cat_sweets: { en: 'Sweets & Snacks', de: 'Süßes & Snacks' },
	cat_frozen: { en: 'Frozen', de: 'Tiefkühl' },
	cat_household: { en: 'Household', de: 'Haushalt' },
	cat_hygiene: { en: 'Hygiene & Body Care', de: 'Hygiene & Körperpflege' },
	cat_other: { en: 'Other', de: 'Sonstiges' },
};

/** Category name translation map (German key → display name per language) */
const categoryDisplayNames: Record<string, Record<string, string>> = {
	'Obst & Gemüse':          { en: 'Fruits & Vegetables', de: 'Obst & Gemüse' },
	'Fleisch & Fisch':        { en: 'Meat & Fish', de: 'Fleisch & Fisch' },
	'Milchprodukte':          { en: 'Dairy', de: 'Milchprodukte' },
	'Brot & Backwaren':       { en: 'Bread & Bakery', de: 'Brot & Backwaren' },
	'Pasta, Reis & Getreide': { en: 'Pasta, Rice & Grains', de: 'Pasta, Reis & Getreide' },
	'Gewürze & Saucen':       { en: 'Spices & Sauces', de: 'Gewürze & Saucen' },
	'Getränke':               { en: 'Beverages', de: 'Getränke' },
	'Süßes & Snacks':         { en: 'Sweets & Snacks', de: 'Süßes & Snacks' },
	'Tiefkühl':               { en: 'Frozen', de: 'Tiefkühl' },
	'Haushalt':               { en: 'Household', de: 'Haushalt' },
	'Hygiene & Körperpflege': { en: 'Hygiene & Body Care', de: 'Hygiene & Körperpflege' },
	'Sonstiges':              { en: 'Other', de: 'Sonstiges' },
};

/** Get translated category display name (shopping categories) */
export function categoryName(category: string, lang: 'en' | 'de'): string {
	return categoryDisplayNames[category]?.[lang] ?? category;
}

/** Payment category translation map */
const paymentCategoryNames: Record<string, Record<string, string>> = {
	groceries:  { en: 'Groceries', de: 'Lebensmittel' },
	shopping:   { en: 'Shopping', de: 'Einkauf' },
	travel:     { en: 'Travel', de: 'Reise' },
	restaurant: { en: 'Restaurant', de: 'Restaurant' },
	utilities:  { en: 'Utilities', de: 'Nebenkosten' },
	fun:        { en: 'Fun', de: 'Freizeit' },
	settlement: { en: 'Settlement', de: 'Ausgleich' },
};

/** Get translated payment category name */
export function paymentCategoryName(category: string, lang: 'en' | 'de'): string {
	return paymentCategoryNames[category]?.[lang] ?? category;
}

/** Get category options with translated labels */
export function getCategoryOptionsI18n(lang: 'en' | 'de') {
	const emojis: Record<string, string> = {
		groceries: '🛒', shopping: '🛍️', travel: '🚆',
		restaurant: '🍽️', utilities: '⚡', fun: '🎉', settlement: '🤝'
	};
	return Object.keys(paymentCategoryNames).map(key => ({
		value: key,
		label: `${emojis[key] || ''} ${paymentCategoryName(key, lang)}`,
		emoji: emojis[key] || '',
		name: paymentCategoryName(key, lang)
	}));
}

/** Get a translated string */
export function t(key: string, lang: 'en' | 'de'): string {
	return translations[key]?.[lang] ?? translations[key]?.en ?? key;
}

/** Format TTL remaining time in the target language */
export function formatTTL(expiresAt: string, lang: 'en' | 'de'): string {
	const diff = new Date(expiresAt).getTime() - Date.now();
	if (diff <= 0) return t('expired', lang);
	const mins = Math.round(diff / 60000);
	if (mins < 60) return `${mins} min`;
	const hours = Math.round(diff / 3600000);
	if (hours < 24) return `${hours} ${lang === 'en' ? 'hrs' : 'Std.'}`;
	const days = Math.round(diff / 86400000);
	return `${days} ${lang === 'en' ? (days > 1 ? 'days' : 'day') : (days > 1 ? 'Tage' : 'Tag')}`;
}

/** Get TTL options for the given language */
export function ttlOptions(lang: 'en' | 'de') {
	return [
		{ label: t('ttl_1h', lang), ms: 1 * 60 * 60 * 1000 },
		{ label: t('ttl_6h', lang), ms: 6 * 60 * 60 * 1000 },
		{ label: t('ttl_24h', lang), ms: 24 * 60 * 60 * 1000 },
		{ label: t('ttl_3d', lang), ms: 3 * 24 * 60 * 60 * 1000 },
		{ label: t('ttl_7d', lang), ms: 7 * 24 * 60 * 60 * 1000 },
	];
}

/** Get locale string for number/date formatting */
export function locale(lang: 'en' | 'de'): string {
	return lang === 'en' ? 'en-CH' : 'de-CH';
}

/** Build a split description string */
export function splitDescription(payment: { splits?: any[]; splitMethod?: string; paidBy?: string }, lang: 'en' | 'de'): string {
	if (!payment.splits || payment.splits.length === 0) return t('no_splits', lang);

	const count = payment.splits.length;
	if (payment.splitMethod === 'equal') {
		return `${t('split_equal', lang)} ${count} ${t('people', lang)}`;
	} else if (payment.splitMethod === 'full') {
		return `${t('paid_full_by', lang)} ${payment.paidBy}`;
	} else if (payment.splitMethod === 'personal_equal') {
		return `${t('personal_equal', lang)} ${count} ${t('people', lang)}`;
	} else {
		return `${t('custom_split', lang)} ${count} ${t('people', lang)}`;
	}
}

/** Get translated frequency description for a recurring payment */
export function frequencyDescription(payment: { frequency: string; cronExpression?: string }, lang: 'en' | 'de'): string {
	switch (payment.frequency) {
		case 'daily': return t('freq_every_day', lang);
		case 'weekly': return t('freq_every_week', lang);
		case 'monthly': return t('freq_every_month', lang);
		case 'custom': return `${t('freq_custom', lang)}: ${payment.cronExpression}`;
		default: return t('freq_unknown', lang);
	}
}

/** Format next execution date with i18n */
export function formatNextExecutionI18n(date: Date, lang: 'en' | 'de'): string {
	const loc = locale(lang);
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
	const timeStr = date.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });

	if (diffDays === 0) {
		return `${t('today_at', lang)} ${timeStr}`;
	} else if (diffDays === 1) {
		return `${t('tomorrow_at', lang)} ${timeStr}`;
	} else if (diffDays < 7) {
		return `${t('in_days_at', lang).replace('{days}', String(diffDays))} ${timeStr}`;
	} else {
		return date.toLocaleString(loc, {
			year: 'numeric', month: 'short', day: 'numeric',
			hour: '2-digit', minute: '2-digit'
		});
	}
}
