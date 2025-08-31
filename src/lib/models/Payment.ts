import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  paid_by: { type: String, required: true },
  total_amount: { type: Number, required: true },
  for_self: { type: Number, default: 0 },
  for_other: { type: Number, default: 0 },
  currency: { type: String, default: 'CHF' },
  description: String,
  date: { type: Date, default: Date.now },
  receipt_image: String
});

export const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);