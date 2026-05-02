import type { Argument, Archetype } from '$lib/data/apologetik';
import type { FaithLang } from '$lib/js/faithI18n';
import { faithSlugFromLang, apologetikSlug } from '$lib/js/faithI18n';

const SITE = 'https://bocken.org';

type CreativeWorkRef = { '@type': 'CreativeWork'; name: string };
type Answer = {
	'@type': 'Answer';
	text: string;
	author: { '@type': 'Person'; name: string };
	citation?: CreativeWorkRef[];
	url: string;
};

export interface ContraQaJsonLd {
	'@context': 'https://schema.org';
	'@type': 'QAPage';
	mainEntity: {
		'@type': 'Question';
		name: string;
		text: string;
		inLanguage: FaithLang;
		answerCount: number;
		suggestedAnswer: Answer[];
	};
}

/** Build a QAPage JSON-LD for a contra argument: one Question, many voiced Answers. */
export function generateContraQaJsonLd(
	arg: Argument,
	archetypes: Record<string, Archetype>,
	lang: FaithLang
): ContraQaJsonLd {
	const faithSeg = faithSlugFromLang(lang);
	const apolSeg = apologetikSlug(lang === 'la' ? 'en' : lang);
	const baseUrl = `${SITE}/${faithSeg}/${apolSeg}/contra/${arg.id}`;

	const archIds = Object.keys(arg.counters);
	const answers: Answer[] = archIds.map((archId) => {
		const counter = arg.counters[archId];
		const archetype = archetypes[archId];
		const text = [counter.lede, ...(counter.body ?? [])].filter(Boolean).join('\n\n');
		const ans: Answer = {
			'@type': 'Answer',
			text,
			author: { '@type': 'Person', name: archetype?.name ?? archId },
			url: `${baseUrl}/${archId}`,
		};
		if (counter.cites?.length) {
			ans.citation = counter.cites.map((name) => ({ '@type': 'CreativeWork', name }));
		}
		return ans;
	});

	return {
		'@context': 'https://schema.org',
		'@type': 'QAPage',
		mainEntity: {
			'@type': 'Question',
			name: arg.title,
			text: arg.steel,
			inLanguage: lang,
			answerCount: answers.length,
			suggestedAnswer: answers,
		},
	};
}
