/**
 * The component that renders each prayer in `prayers.ts`, by id, with the
 * props it takes on the overview's card and on its own page. Apart from the
 * registry so importing the slug list does not bundle every prayer.
 */
import type { Component } from 'svelte';
import Kreuzzeichen from '$lib/components/faith/prayers/Kreuzzeichen.svelte';
import GloriaPatri from '$lib/components/faith/prayers/GloriaPatri.svelte';
import Paternoster from '$lib/components/faith/prayers/Paternoster.svelte';
import Credo from '$lib/components/faith/prayers/Credo.svelte';
import AveMaria from '$lib/components/faith/prayers/AveMaria.svelte';
import SalveRegina from '$lib/components/faith/prayers/SalveRegina.svelte';
import FatimaGebet from '$lib/components/faith/prayers/FatimaGebet.svelte';
import Gloria from '$lib/components/faith/prayers/Gloria.svelte';
import MichaelGebet from '$lib/components/faith/prayers/MichaelGebet.svelte';
import BruderKlausGebet from '$lib/components/faith/prayers/BruderKlausGebet.svelte';
import JosephGebet from '$lib/components/faith/prayers/JosephGebet.svelte';
import Confiteor from '$lib/components/faith/prayers/Confiteor.svelte';
import GuardianAngel from '$lib/components/faith/prayers/GuardianAngel.svelte';
import ApostlesCreed from '$lib/components/faith/prayers/ApostlesCreed.svelte';
import TantumErgo from '$lib/components/faith/prayers/TantumErgo.svelte';
import Angelus from '$lib/components/faith/prayers/Angelus.svelte';
import ReginaCaeli from '$lib/components/faith/prayers/ReginaCaeli.svelte';
import AnimaChristi from '$lib/components/faith/prayers/AnimaChristi.svelte';
import PrayerBeforeACrucifix from '$lib/components/faith/prayers/PrayerBeforeACrucifix.svelte';
import Postcommunio from '$lib/components/faith/prayers/Postcommunio.svelte';
import JungfrauMutterGottes from '$lib/components/faith/prayers/JungfrauMutterGottes.svelte';
import ODominaMea from '$lib/components/faith/prayers/ODominaMea.svelte';
import Memorare from '$lib/components/faith/prayers/Memorare.svelte';
import HilfMaria from '$lib/components/faith/prayers/HilfMaria.svelte';
import TischgebetVor from '$lib/components/faith/prayers/TischgebetVor.svelte';
import TischgebetNach from '$lib/components/faith/prayers/TischgebetNach.svelte';

type Props = Record<string, unknown>;

export interface PrayerView {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	component: Component<any>;
	/** Props on the overview's card. */
	cardProps?: Props;
	/** Props on the prayer's own page. */
	pageProps?: Props;
}

export const PRAYER_COMPONENTS: Record<string, PrayerView> = {
	signOfCross: { component: Kreuzzeichen },
	gloriaPatri: { component: GloriaPatri },
	paternoster: { component: Paternoster },
	credo: { component: Credo },
	aveMaria: { component: AveMaria },
	salveRegina: { component: SalveRegina },
	fatima: { component: FatimaGebet },
	// The page shows the Gloria's introduction above the card instead.
	gloria: { component: Gloria, cardProps: { intro: true } },
	michael: { component: MichaelGebet },
	bruderKlaus: { component: BruderKlausGebet },
	joseph: { component: JosephGebet },
	confiteor: { component: Confiteor },
	guardianAngel: { component: GuardianAngel },
	apostlesCreed: { component: ApostlesCreed },
	tantumErgo: { component: TantumErgo },
	angelus: { component: Angelus, pageProps: { verbose: true } },
	reginaCaeli: { component: ReginaCaeli },
	animachristi: { component: AnimaChristi },
	prayerbeforeacrucifix: { component: PrayerBeforeACrucifix },
	postcommunio: { component: Postcommunio, cardProps: { onlyIntro: true }, pageProps: { onlyIntro: false } },
	jungfrauMutter: { component: JungfrauMutterGottes },
	oMyQueen: { component: ODominaMea },
	memorare: { component: Memorare },
	hilfMaria: { component: HilfMaria },
	tischgebetVor: { component: TischgebetVor },
	tischgebetNach: { component: TischgebetNach }
};
