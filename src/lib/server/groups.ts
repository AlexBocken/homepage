/**
 * Authentik group codenames → human-friendly labels, and whether a normal user
 * may request to join a group.
 *
 * Admin/system groups are listed too (so an existing membership still renders a
 * pretty pill) but marked `requestable: false`, so they never appear in the
 * self-service request form. Unknown codenames fall back to the raw name and
 * are treated as non-requestable.
 *
 * This module is safe for the client — it holds no secrets.
 */
export type GroupMeta = {
	/** Display label shown in pills and the request form. */
	label: string;
	/** Whether a normal user may request to join this group. */
	requestable: boolean;
};

export const GROUPS: Record<string, GroupMeta> = {
	'authentik Admins': { label: 'Authentik-Admins', requestable: false },
	jellyfin_users: { label: 'Streaming', requestable: true },
	jellyfin_admins: { label: 'Streaming-Admins', requestable: false },
	gitea_users: { label: 'Git', requestable: true },
	gitea_admins: { label: 'Git-Admins', requestable: false },
	webtrees_users: { label: 'Familienstammbaum', requestable: true },
	paperless_users: { label: 'Paperless', requestable: true },
	transmission_users: { label: 'Torrents', requestable: true },
	ldapsearch: { label: 'LDAP-Suche', requestable: false },
	rezepte_users: { label: 'Rezepte', requestable: true },
	mail_users: { label: 'E-Mail', requestable: true },
	familienbilder_users: { label: 'Familienbilder', requestable: true },
	audiobookshelf: { label: 'Hörbücher und Podcasts', requestable: true },
	cospend: { label: 'Shopping', requestable: true },
	fitness: { label: 'Fitness', requestable: true },
	opencloud_admins: { label: 'Cloud-Admins', requestable: false },
	opencloud_users: { label: 'Cloud', requestable: true },
	task_users: { label: 'Aufgaben', requestable: true },
	'ldap-search': { label: 'LDAP-Suche', requestable: false },

	// Dropped from the request form (requestable: false). The label is retained
	// so an existing membership still renders a readable pill rather than the raw
	// codename. photoprism is superseded by familienbilder_users above.
	photoprism_users: { label: 'PhotoPrism', requestable: false },
	papers_users: { label: 'Papers', requestable: false },
	paperless_eltern_users: { label: 'Paperless (Eltern)', requestable: false },
	health_users: { label: 'Health', requestable: false },
	'gramps-owner': { label: 'Gramps (Owner)', requestable: false },
	'gramps-user': { label: 'Gramps', requestable: false },
};

/** Pretty label for a codename, falling back to the raw codename. */
export function groupLabel(codename: string): string {
	return GROUPS[codename]?.label ?? codename;
}

/** Whether a normal user may request this group. Unknown groups are not. */
export function isRequestable(codename: string): boolean {
	return GROUPS[codename]?.requestable ?? false;
}

/** All requestable groups as `{ codename, label }`, sorted by label. */
export function requestableGroups(): { codename: string; label: string }[] {
	return Object.entries(GROUPS)
		.filter(([, m]) => m.requestable)
		.map(([codename, m]) => ({ codename, label: m.label }))
		.sort((a, b) => a.label.localeCompare(b.label, 'de'));
}
