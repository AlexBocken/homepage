import mongoose from 'mongoose';

export interface IBodyPartMeasurements {
	neck?: number;
	shoulders?: number;
	chest?: number;
	leftBicep?: number;
	rightBicep?: number;
	leftForearm?: number;
	rightForearm?: number;
	waist?: number;
	hips?: number;
	leftThigh?: number;
	rightThigh?: number;
	leftCalf?: number;
	rightCalf?: number;
}

export interface IBodyMeasurement {
	_id?: string;
	date: Date;
	weight?: number;
	bodyFatPercent?: number;
	caloricIntake?: number;
	measurements?: IBodyPartMeasurements;
	notes?: string;
	createdBy: string;
	createdAt?: Date;
	updatedAt?: Date;
}

const BodyPartMeasurementsSchema = new mongoose.Schema(
	{
		neck: { type: Number, min: 0 },
		shoulders: { type: Number, min: 0 },
		chest: { type: Number, min: 0 },
		leftBicep: { type: Number, min: 0 },
		rightBicep: { type: Number, min: 0 },
		leftForearm: { type: Number, min: 0 },
		rightForearm: { type: Number, min: 0 },
		waist: { type: Number, min: 0 },
		hips: { type: Number, min: 0 },
		leftThigh: { type: Number, min: 0 },
		rightThigh: { type: Number, min: 0 },
		leftCalf: { type: Number, min: 0 },
		rightCalf: { type: Number, min: 0 }
	},
	{ _id: false }
);

const BodyMeasurementSchema = new mongoose.Schema(
	{
		date: {
			type: Date,
			required: true,
			default: Date.now
		},
		weight: {
			type: Number,
			min: 0,
			max: 500
		},
		bodyFatPercent: {
			type: Number,
			min: 0,
			max: 100
		},
		caloricIntake: {
			type: Number,
			min: 0,
			max: 50000
		},
		measurements: {
			type: BodyPartMeasurementsSchema
		},
		notes: {
			type: String,
			trim: true,
			maxlength: 500
		},
		createdBy: {
			type: String,
			required: true,
			trim: true
		}
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true }
	}
);

BodyMeasurementSchema.index({ createdBy: 1, date: -1 });

export const BodyMeasurement = mongoose.model<IBodyMeasurement>(
	'BodyMeasurement',
	BodyMeasurementSchema
);
