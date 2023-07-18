import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
     username: {type: String, required: true, unique: true},
     pass_hash: {type: String, required: true},
     salt : {type: String, required: true},
     access: [String], //rezepte, flims, abrechnung, ...
     }, {timestamps: true}
);

export const User = mongoose.model("User", UserSchema);
