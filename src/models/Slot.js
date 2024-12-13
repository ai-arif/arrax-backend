const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true }, // Reference to the user
    slotNumber: { type: Number, required: true }, // Slot 1 to Slot 10
    isActive: { type: Boolean, default: false }, // Whether the slot is activated
    sectionsCompleted: { type: Number, default: 0 }, // Sections completed in the slot
    activatedAt: { type: Date }, // Timestamp when the slot was activated
    price: { type: Number, required: true }, // Price of the slot
    referrals: [
      {
        userId: { type: Number, required: true }, // Referral's userId
        slotNumber: { type: Number, required: true }, // Slot purchased by referral
        purchasedAt: { type: Date, required: true }, // When the referral purchased the slot
      },
    ], // Users referred who purchased this slot
    generationData: [
      {
        generationLevel: { type: Number, required: true }, // Referral generation (1 to 10)
        count: { type: Number, default: 0 }, // Number of users at this generation
      },
    ], // Generation-level data
    recycleCount: { type: Number, default: 0 }, // Number of times the slot has been recycled
    recycleUserCount: { type: Number, default: 0 }, // Number of users who have recycled this slot
    usersCount: { type: Number, default: 0 }, // Number of users who have purchased this slot
    subSlotIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubSlot" }], // Array of sub-slot IDs
  },
  { timestamps: true }
);

// Predefine slot prices
slotSchema.statics.slotPrices = [4, 8, 15, 30, 60, 120, 240, 480, 960, 1920];

module.exports = mongoose.model("Slot", slotSchema);
