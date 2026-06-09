/**
 * Minimal SMTP mailer (server-only). Reuses the same SMTP relay as Authentik.
 * The SMTP_* connection config is inlined at build time ($env/static/private),
 * so all SMTP_* keys must be present in the build env. GROUP_REQUEST_TO is an
 * optional recipient whose default is the intended one, so it stays a dynamic
 * read (undefined at runtime → falls back to admin@bocken.org).
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } from '$env/static/private';
import { env } from '$env/dynamic/private';

let cached: Transporter | null = null;

function transporter(): Transporter {
	if (cached) return cached;
	if (!SMTP_HOST) throw new Error('SMTP_HOST is not configured');
	cached = nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT) || 587,
		secure: SMTP_SECURE === 'true',
		auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
	});
	return cached;
}

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }): Promise<void> {
	const from = SMTP_FROM || SMTP_USER || 'noreply@bocken.org';
	await transporter().sendMail({ from, ...opts });
}

/** Escape untrusted text before interpolating it into an HTML email body. */
function esc(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Notify the admin that a user has requested access to one or more groups. */
export async function sendGroupRequest(opts: {
	username: string;
	displayName: string;
	email: string;
	/** Human-readable group labels. */
	groups: string[];
	note?: string;
}): Promise<void> {
	const to = env.GROUP_REQUEST_TO || 'admin@bocken.org';
	const who = `${opts.displayName} (${opts.username}${opts.email ? `, ${opts.email}` : ''})`;
	const subject = `Gruppen-Anfrage: ${opts.displayName} (${opts.username})`;
	const text =
		`${who} möchte folgenden Gruppen beitreten:\n\n` +
		opts.groups.map((g) => `  • ${g}`).join('\n') +
		(opts.note ? `\n\nNachricht:\n${opts.note}` : '') +
		`\n\nManuell in Authentik unter „Directory → Groups" hinzufügen.`;
	const html =
		`<p><strong>${esc(opts.displayName)}</strong> (${esc(opts.username)}${opts.email ? `, ${esc(opts.email)}` : ''}) ` +
		`möchte folgenden Gruppen beitreten:</p>` +
		`<ul>${opts.groups.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` +
		(opts.note ? `<p><strong>Nachricht:</strong><br>${esc(opts.note)}</p>` : '') +
		`<p style="color:#888">Manuell in Authentik unter „Directory → Groups" hinzufügen.</p>`;
	await sendMail({ to, subject, text, html });
}

/** Notify the admin that someone has requested a new account. The admin creates
 *  the account in Authentik manually — there is no self-service registration. */
export async function sendAccountRequest(opts: {
	email: string;
	/** Requested username (subject to admin change). */
	username: string;
	/** Human-readable labels of the requested groups. */
	groups: string[];
	note?: string;
}): Promise<void> {
	const to = env.GROUP_REQUEST_TO || 'admin@bocken.org';
	const subject = `Konto-Anfrage: ${opts.username}`;
	const groupList = opts.groups.length ? opts.groups.map((g) => `  • ${g}`).join('\n') : '  (keine)';
	const text =
		`Neue Konto-Anfrage:\n\n` +
		`E-Mail: ${opts.email}\n` +
		`Gewünschter Benutzername: ${opts.username}\n\n` +
		`Gewünschte Berechtigungen:\n${groupList}\n` +
		(opts.note ? `\nNachricht:\n${opts.note}\n` : '') +
		`\nKonto manuell in Authentik anlegen.`;
	const html =
		`<p>Neue Konto-Anfrage:</p>` +
		`<ul>` +
		`<li><strong>E-Mail:</strong> ${esc(opts.email)}</li>` +
		`<li><strong>Gewünschter Benutzername:</strong> ${esc(opts.username)}</li>` +
		`</ul>` +
		`<p><strong>Gewünschte Berechtigungen:</strong></p>` +
		(opts.groups.length ? `<ul>${opts.groups.map((g) => `<li>${esc(g)}</li>`).join('')}</ul>` : `<p>(keine)</p>`) +
		(opts.note ? `<p><strong>Nachricht:</strong><br>${esc(opts.note)}</p>` : '') +
		`<p style="color:#888">Konto manuell in Authentik anlegen.</p>`;
	await sendMail({ to, subject, text, html });
}

/** Verification email for a self-service email-address change. */
export async function sendEmailChangeVerification(to: string, displayName: string, link: string): Promise<void> {
	const subject = 'Bestätige deine neue E-Mail-Adresse';
	const text =
		`Hallo ${displayName},\n\n` +
		`du hast angefragt, deine E-Mail-Adresse auf bocken.org zu ändern.\n` +
		`Bestätige die Änderung über folgenden Link (1 Stunde gültig):\n\n${link}\n\n` +
		`Wenn du das nicht warst, kannst du diese E-Mail ignorieren — es wird nichts geändert.`;
	const html =
		`<p>Hallo ${esc(displayName)},</p>` +
		`<p>du hast angefragt, deine E-Mail-Adresse auf <strong>bocken.org</strong> zu ändern. ` +
		`Bestätige die Änderung über den folgenden Link (1&nbsp;Stunde gültig):</p>` +
		`<p><a href="${link}">E-Mail-Adresse bestätigen</a></p>` +
		`<p style="color:#888">Wenn du das nicht warst, kannst du diese E-Mail ignorieren — es wird nichts geändert.</p>`;
	await sendMail({ to, subject, text, html });
}
