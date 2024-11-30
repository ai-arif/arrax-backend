const mongoose = require("mongoose");
const transactionSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
    transactionType: {
      type: String,
      required: true,
      enum: ["SlotUpgrade", "ReferralIncome", "LevelIncome", "OwnerIncome"],
    },
    relatedUser: { type: Number, default: null }, // UserId of the related user (e.g., referral or upline)
    slotNumber: { type: Number, required: true }, // Slot associated with the transaction
    section: { type: Number, required: true }, // Section number (1-12)
    generationLevel: { type: Number, default: null }, // Generation level for level income
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
