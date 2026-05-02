import type { Argument, Archetype, PosArgument, PosVoice } from '$lib/data/apologetik';
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

export interface ProArgArticleJsonLd {
	'@context': 'https://schema.org';
	'@type': 'Article';
	headline: string;
	description: string;
	inLanguage: FaithLang;
	url: string;
	mainEntityOfPage: string;
	author: { '@type': 'Person'; name: string; url: string };
	publisher: { '@type': 'Person'; name: string; url: string };
	articleSection: string;
	keywords?: string;
	citation?: Array<{ '@type': 'CreativeWork'; name: string }>;
}

/** Build an Article JSON-LD for a positive (pro) apologetik argument. */
export function generateProArgArticleJsonLd(
	arg: PosArgument,
	voices: Record<string, PosVoice>,
	lang: FaithLang
): ProArgArticleJsonLd {
	const faithSeg = faithSlugFromLang(lang);
	const apolSeg = apologetikSlug(lang === 'la' ? 'en' : lang);
	const url = `https://bocken.org/${faithSeg}/${apolSeg}/pro/${arg.id}`;

	const allCites = Object.values(arg.voices).flatMap((v) => v.cites ?? []);
	const uniqueCites = Array.from(new Set(allCites));
	const voiceNames = Object.keys(arg.voices)
		.map((id) => voices[id]?.name ?? id)
		.join(', ');

	const article: ProArgArticleJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: arg.title,
		description: arg.claim,
		inLanguage: lang,
		url,
		mainEntityOfPage: url,
		author: { '@type': 'Person', name: 'Alexander Bocken', url: 'https://bocken.org/' },
		publisher: { '@type': 'Person', name: 'Alexander Bocken', url: 'https://bocken.org/' },
		articleSection: arg.layer,
	};
	if (voiceNames) article.keywords = voiceNames;
	if (uniqueCites.length) article.citation = uniqueCites.map((name) => ({ '@type': 'CreativeWork', name }));
	return article;
}
