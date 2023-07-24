import mongoose from 'mongoose';

const PaymentSchema= new mongoose.Schema(
  {
    payee: {type: String, required: true},
    amount: {type: Number, required: true},
    for_self: {type: Number},
    for_other: {type: Number},
    description: {type: String},
    added_by: {type: String},
    date: {type: Date, required: true, default: Date.now},
  }, {timestamps: true}
);

export const Payment = mongoose.model("Payment", PaymentSchema);
