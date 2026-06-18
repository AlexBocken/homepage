// Per-user highlighter colors for receipt assignments. Keyed by a username hash
// (not array index) so a person's colour is identical wherever it's drawn — the
// add-payment editor and the stored-payment overlay.

export interface PenColor {
	/** translucent fill (sits over the receipt via mix-blend multiply) */
	bg: string;
	/** solid outline / accent */
	line: string;
}

export const PEN_COLORS: PenColor[] = [
	{ bg: 'rgba(129,199,212,0.55)', line: 'rgba(2,136,170,0.85)' }, // teal
	{ bg: 'rgba(244,143,177,0.55)', line: 'rgba(194,24,91,0.85)' }, // pink
	{ bg: 'rgba(165,214,167,0.55)', line: 'rgba(46,125,50,0.85)' }, // green
	{ bg: 'rgba(255,204,128,0.55)', line: 'rgba(230,108,0,0.85)' } // orange
];

export function penColor(user: string): PenColor {
	let h = 0;
	for (let i = 0; i < user.length; i++) h = (h * 31 + user.charCodeAt(i)) >>> 0;
	return PEN_COLORS[h % PEN_COLORS.length];
}
