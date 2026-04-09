import mongoose from 'mongoose';

const RoundOffCacheSchema = new mongoose.Schema({
	createdBy: { type: String, required: true },
	date: { type: String, required: true },
	remainingKcal: { type: Number, required: true },
	remainingProtein: { type: Number, required: true },
	remainingFat: { type: Number, required: true },
	remainingCarbs: { type: Number, required: true },
	suggestions: { type: mongoose.Schema.Types.Mixed, default: [] },
	foodPoolCount: { type: Number, default: 0 },
	recipeCount: { type: Number, default: 0 },
	computedAt: { type: Date, default: Date.now },
});

RoundOffCacheSchema.index({ createdBy: 1, date: 1 }, { unique: true });
RoundOffCacheSchema.index({ computedAt: 1 }, { expireAfterSeconds: 86400 });

let _model: mongoose.Model<any>;
try { _model = mongoose.model('RoundOffCache'); } catch { _model = mongoose.model('RoundOffCache', RoundOffCacheSchema); }
export const RoundOffCache = _model;
