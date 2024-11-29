const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      unique: true,
      required: true,
      index: true,
      autoIncrement: true,
    },
    fullName: { type: String, required: true },
    walletAddress: { type: String, unique: true, required: true },
    referredBy: { type: Number, required: true }, // Referral's userId
    isOwner: { type: Boolean, default: false }, // Set true for the system owner
    directReferrals: { type: [Number], default: [] }, // Array of userIds directly referred by this user
    totalTeam: { type: Number, default: 0 }, // Total users under this user
    activeTeam: { type: Number, default: 0 }, // Total active users under this user
    income: {
      total: { type: Number, default: 0 },
      levelIncome: { type: Number, default: 0 }, // Income from levels
      directIncome: { type: Number, default: 0 }, // Income from direct referrals
      slotIncome: { type: Number, default: 0 }, // Income from slot transactions
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
