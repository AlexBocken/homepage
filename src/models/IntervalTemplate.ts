import mongoose from 'mongoose';

export interface IIntervalStep {
  type?: 'step';
  label: string;
  durationType: 'distance' | 'time';
  durationValue: number; // meters (distance) or seconds (time)
}

export interface IIntervalGroup {
  type: 'group';
  repeat: number;
  steps: IIntervalStep[];
}

export type IIntervalEntry = IIntervalStep | IIntervalGroup;

export interface IIntervalTemplate {
  _id?: string;
  name: string;
  steps: IIntervalEntry[];
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const IntervalTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    steps: {
      type: [mongoose.Schema.Types.Mixed],
      required: true,
      validate: {
        validator: function(steps: IIntervalEntry[]) {
          return Array.isArray(steps) && steps.length > 0;
        },
        message: 'An interval template must have at least one step'
      }
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

IntervalTemplateSchema.index({ createdBy: 1 });

function validateStep(s: any): string | null {
  if (!s || typeof s !== 'object') return 'Invalid step';
  if (!s.label || typeof s.label !== 'string') return 'Each step must have a label';
  if (!['distance', 'time'].includes(s.durationType)) return 'durationType must be "distance" or "time"';
  if (typeof s.durationValue !== 'number' || s.durationValue < 1) return 'durationValue must be a positive number';
  return null;
}

/** Validate an interval entry list. Groups allowed at top level only (depth cap 1). */
export function validateIntervalEntries(entries: any[], allowGroup = true): string | null {
  if (!Array.isArray(entries) || entries.length === 0) return 'At least one step is required';
  for (const e of entries) {
    if (e?.type === 'group') {
      if (!allowGroup) return 'Groups cannot be nested';
      if (typeof e.repeat !== 'number' || e.repeat < 1 || e.repeat > 99) return 'Group repeat must be 1-99';
      const inner = validateIntervalEntries(e.steps, false);
      if (inner) return inner;
    } else {
      const err = validateStep(e);
      if (err) return err;
    }
  }
  return null;
}

/** Flatten groups by expanding repeat × steps into a flat step list. */
export function flattenIntervalEntries(entries: IIntervalEntry[]): IIntervalStep[] {
  const out: IIntervalStep[] = [];
  for (const e of entries) {
    if ((e as IIntervalGroup).type === 'group') {
      const g = e as IIntervalGroup;
      for (let i = 0; i < g.repeat; i++) {
        for (const s of g.steps) out.push({ ...s, type: 'step' });
      }
    } else {
      const s = e as IIntervalStep;
      out.push({ ...s, type: 'step' });
    }
  }
  return out;
}

export const IntervalTemplate = mongoose.model<IIntervalTemplate>("IntervalTemplate", IntervalTemplateSchema);
