const mongoose = require("mongoose");
const slotSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true },
    slotNumber: { type: Number, required: true }, // Slot 1 to Slot 10
    isActive: { type: Boolean, default: false },
    sectionsCompleted: { type: Number, default: 0 }, // Sections completed in the slot
    activatedAt: { type: Date }, // Timestamp when the slot was activated
  },
  { timestamps: true }
);

module.exports = mongoose.model("Slot", slotSchema);
