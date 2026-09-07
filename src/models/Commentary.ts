import mongoose from 'mongoose';

/**
 * One commentary entry on a passage: a Father's excerpt on a verse (or a
 * range from `verse` to `verseEnd`), a chapter-level text such as a homily
 * section, or a book introduction (`chapter` 0). Imported once by
 * `scripts/import-commentary.ts`; `lang` is the language of `text`, so
 * translations are further rows with the same anchor and author.
 */
const CommentarySchema = new mongoose.Schema(
	{
		slug: { type: String, required: true },
		chapter: { type: Number, required: true },
		verse: { type: Number, required: true },
		verseEnd: { type: Number, default: null },
		kind: { type: String, required: true, enum: ['verse', 'chapter', 'book'] },
		author: { type: String, required: true },
		authorName: { type: String, required: true },
		group: { type: String, required: true, enum: ['father', 'medieval', 'modern'] },
		died: { type: Number, default: null },
		source: { type: String, required: true },
		work: { type: String, default: null },
		title: { type: String, default: null },
		lang: { type: String, required: true, enum: ['en', 'de', 'la'] },
		text: { type: String, required: true },
		chars: { type: Number, required: true },
		/** Position within the chapter for stable ordering. */
		order: { type: Number, required: true },
		key: { type: String, required: true, unique: true }
	},
	{ timestamps: false }
);
CommentarySchema.index({ slug: 1, chapter: 1, verse: 1, author: 1, lang: 1 });
CommentarySchema.index({ slug: 1, chapter: 1, kind: 1, lang: 1 });
CommentarySchema.index({ author: 1, slug: 1, chapter: 1, lang: 1 });

export interface ICommentary {
	slug: string;
	chapter: number;
	verse: number;
	verseEnd: number | null;
	kind: 'verse' | 'chapter' | 'book';
	author: string;
	authorName: string;
	group: 'father' | 'medieval' | 'modern';
	died: number | null;
	source: string;
	work: string | null;
	title: string | null;
	lang: 'en' | 'de' | 'la';
	text: string;
	chars: number;
	order: number;
	key: string;
}

let _model: mongoose.Model<ICommentary>;
try {
	_model = mongoose.model<ICommentary>('Commentary');
} catch {
	_model = mongoose.model<ICommentary>('Commentary', CommentarySchema);
}
export const Commentary = _model;
