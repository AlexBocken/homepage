import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema(
  {
    type: {type: String, required: true, enum: ['payment', 'reimbursement']},
    name: {type: String, required: true},
    category : {type: String, required: false,},
    date: {type: Date, default: Date.now},
    images: [ {
	    mediapath: {type: String, required: false},
    }],
    description: {type: String, required: false},
    note: {type: String, required: false},
    tags : [String],
    original_amount: {type: Number, required: true},
    total_amount: {type: Number, required: true},
    personal_amounts: [{
	    user: {type:String, required: true},
	    amount: {type: Number, required: true, default:0}
	}],
    currency: {type: String, required: true, default: 'CHF'},
     }, {timestamps: true}
);

export const Payment= mongoose.model("Payment", PaymentSchema);
