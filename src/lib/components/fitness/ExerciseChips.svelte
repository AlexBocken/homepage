<script>
	/**
	 * The chip row describing an exercise: type, body part, equipment, and
	 * optionally target muscle.
	 *
	 * Shared by the exercise list and the exercise detail page so both describe an
	 * exercise the same way. The list previously showed body part and equipment as
	 * plain text with a lone STRETCH pill wedged into the name, which made stretches
	 * look like the only exercise with attributes worth chipping.
	 *
	 * Type, body part and equipment are set on every exercise in the catalogue, so
	 * every row gets the same three chips. A missing type is still rendered as a
	 * gap rather than guessed at — see the classification note in data/exercises.ts.
	 */
	import { exerciseTypeKey } from '$lib/data/exercisedb';
	import { m } from '$lib/js/fitnessI18n';

	/**
	 * `lang` is a prop rather than sniffed off the URL: both call sites already have
	 * it, and a chip row has no business knowing about routing.
	 * @type {{
	 *   exercise: { exerciseType?: string, bodyPart?: string, target?: string, localBodyPart?: string, localEquipment?: string, localTarget?: string } | null | undefined,
	 *   lang: 'en' | 'de',
	 *   showTarget?: boolean,
	 *   size?: 'sm' | 'md',
	 * }}
	 */
	let { exercise, lang, showTarget = false, size = 'md' } = $props();

	const t = $derived(m[lang]);

	const typeKey = $derived(exerciseTypeKey(exercise?.exerciseType));

	/**
	 * Cardio exercises restate their category in the anatomy fields: 26 carry
	 * `bodyPart: 'cardio'` and 11 carry `target: 'cardiovascular system'`, neither of
	 * which is a body part or a muscle. Left alone they read "Cardio · cardio ·
	 * machine" and "Cardio · Body weight · cardiovascular system". Drop those chips
	 * when the type chip is present to carry the meaning; anything with a real muscle
	 * (assault-bike-run targets quadriceps) keeps it.
	 *
	 * Keyed off the raw fields, not the localised labels: in German the pill reads
	 * "Cardio" while the labels are "Ausdauer" and "Herz-Kreislauf-System", so
	 * comparing display strings would leave the duplicates standing in German.
	 */
	const showBodyPart = $derived(
		!!exercise?.localBodyPart && !(typeKey && exercise?.bodyPart === 'cardio')
	);
	const renderTarget = $derived(
		showTarget
			&& !!exercise?.localTarget
			&& !(typeKey === 'cardio' && exercise?.target === 'cardiovascular system')
	);
	const typeLabel = $derived(
		typeKey === 'stretch' ? t.stretch_pill
			: typeKey === 'strength' ? t.strength_pill
			: typeKey === 'cardio' ? t.cardio_pill
			: typeKey === 'plyo' ? t.plyo_pill
			: ''
	);
</script>

<div class="tags" class:sm={size === 'sm'}>
	{#if typeKey}
		<span class="tag type-{typeKey}">{typeLabel}</span>
	{/if}
	{#if showBodyPart}
		<span class="tag body-part">{exercise?.localBodyPart}</span>
	{/if}
	{#if exercise?.localEquipment}
		<span class="tag equipment">{exercise.localEquipment}</span>
	{/if}
	{#if renderTarget}
		<span class="tag target">{exercise?.localTarget}</span>
	{/if}
</div>

<style>
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
	.tag {
		padding: 0.25rem 0.6rem;
		border-radius: var(--radius-pill);
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: capitalize;
		white-space: nowrap;
	}
	.body-part { background: rgba(94, 129, 172, 0.2); color: var(--lightblue); }
	.equipment { background: rgba(163, 190, 140, 0.2); color: var(--green); }
	.target { background: rgba(208, 135, 112, 0.2); color: var(--orange); }
	.tag.type-stretch,
	.tag.type-strength,
	.tag.type-cardio,
	.tag.type-plyo {
		font-weight: 700;
		letter-spacing: 0.04em;
	}
	.tag.type-stretch { background: rgba(180, 142, 173, 0.2); color: var(--purple); }
	.tag.type-strength { background: rgba(94, 129, 172, 0.2); color: var(--blue); }
	.tag.type-cardio { background: rgba(191, 97, 106, 0.2); color: var(--red); }
	.tag.type-plyo { background: rgba(235, 203, 139, 0.22); color: var(--color-amber-text); }

	/* Dense list rows: smaller chips, tighter gaps. */
	.tags.sm {
		gap: 0.3rem;
	}
	.tags.sm .tag {
		padding: 0.1rem 0.4rem;
		font-size: 0.62rem;
		font-weight: 600;
	}
	.tags.sm .tag.type-stretch,
	.tags.sm .tag.type-strength,
	.tags.sm .tag.type-cardio,
	.tags.sm .tag.type-plyo {
		font-weight: 700;
	}
</style>
