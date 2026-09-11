/**
 * The Psalms are numbered twice.
 *
 * All three editions of the Catechism cite the Hebrew numbering that modern
 * translations use; the Bible on this site is Allioli with the Vulgate beside
 * it, and the Douay-Rheims under /faith — all three Vulgate-numbered, where
 * Psalm 51 is Psalm 50. Citing one into the other without translating the
 * number lands the reader in a different psalm.
 *
 * The chapter translates exactly. The verse does not: the Vulgate counts a
 * psalm's superscription as a verse (Allioli's Ps 50,1 is "Zum Ende, ein Psalm
 * Davids"), and how many verses that takes differs from psalm to psalm. So a
 * psalm citation is linked to the psalm and not to a verse — better than
 * pointing confidently at the wrong line.
 */

/** Vulgate chapter for a Hebrew one, or null where the two split a psalm. */
export function vulgatePsalm(hebrew: number): number | null {
	if (hebrew < 1 || hebrew > 150) return null;
	if (hebrew <= 8) return hebrew;
	if (hebrew === 9 || hebrew === 10) return 9; // Vulgate 9 holds both
	if (hebrew <= 113) return hebrew - 1;
	if (hebrew === 114 || hebrew === 115) return 113; // Vulgate 113 holds both
	if (hebrew === 116) return 114; // and 115; the split is inside the psalm
	if (hebrew <= 146) return hebrew - 1;
	if (hebrew === 147) return 146; // and 147
	return hebrew; // 148–150 agree
}
