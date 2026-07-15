import mongoose from 'mongoose';

// Live "Verzug" (running delay) of the Aktive on the Trommler tour. One document
// per tour year; a logged-in user marks where the Aktive actually are and the
// resulting offset (in minutes) shifts the Aktive schedule in the hero.
const TourplanDelaySchema = new mongoose.Schema(
	{
		tour: { type: String, required: true, unique: true }, // e.g. "2026"
		delayMinutes: { type: Number, required: true, default: 0 },
		stationKey: { type: String, default: null }, // "date|time|name" of the marked stop
		loggedBy: { type: String, default: null }, // nickname of the reporter
		loggedAt: { type: Number, default: null } // epoch ms the report was filed
	},
	{ timestamps: true }
);

interface ITourplanDelay {
	tour: string;
	delayMinutes: number;
	stationKey: string | null;
	loggedBy: string | null;
	loggedAt: number | null;
}

let _model: mongoose.Model<ITourplanDelay>;
try {
	_model = mongoose.model<ITourplanDelay>('TourplanDelay');
} catch {
	_model = mongoose.model<ITourplanDelay>('TourplanDelay', TourplanDelaySchema);
}
export const TourplanDelay = _model;
