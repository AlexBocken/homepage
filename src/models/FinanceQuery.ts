import mongoose from 'mongoose';

// A named, saved BQL query (private to the finances owner). Not ledger data —
// just the user's favourite queries for the query console.
const FinanceQuerySchema = new mongoose.Schema(
	{
		createdBy: { type: String, required: true },
		name: { type: String, required: true, trim: true, maxlength: 120 },
		query: { type: String, required: true, maxlength: 5000 }
	},
	{ timestamps: true }
);
FinanceQuerySchema.index({ createdBy: 1, name: 1 });

interface IFinanceQuery {
	createdBy: string;
	name: string;
	query: string;
}

let _model: mongoose.Model<IFinanceQuery>;
try {
	_model = mongoose.model<IFinanceQuery>('FinanceQuery');
} catch {
	_model = mongoose.model<IFinanceQuery>('FinanceQuery', FinanceQuerySchema);
}
export const FinanceQuery = _model;
