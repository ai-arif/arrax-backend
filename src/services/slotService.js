const Order = require("../models/Order");
const User = require("../models/User");
const Slot = require("../models/Slot");
const {
  getUserSlot,
  getLevelReferralDetails,
} = require("../controllers/bookingContractController");

const insertSlotInfo = async ({ user, level }) => {
  try {
    console.log("@@@@@@@@@ inserting slot started @@@@@@@@@@@");
    const userInfo = await User.findOne({ walletAddress: user });
    if (!userInfo) {
      throw new Error("User not found");
    }
    console.log("User found to insert slot info", userInfo?.userId);

    const currentSlot = await getUserSlot(user.walletAddress);
    const activeSlot = currentSlot?.activeSlot;

    userInfo.currentActiveSlot = activeSlot;
    await userInfo.save();
    const currentLevel = Number(level);
    console.log("Current level", currentLevel);

    const levelReferralDetails = await getLevelReferralDetails(
      userInfo.walletAddress,
      currentLevel
    );

    const convertedDetails = JSON.parse(
      JSON.stringify(levelReferralDetails, (_, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );
    if (!convertedDetails?.data === undefined) {
      throw new Error("No data found");
    }
    console.log("Details for current slot", convertedDetails.data);

    // Upsert logic: find an existing slot or create a new one
    const slot = await Slot.findOneAndUpdate(
      { userId: userInfo?.userId, slot: currentLevel }, // Filter by userId and slot
      {
        userId: userInfo?.userId,
        walletAddress: user,
        slot: currentLevel,
        data: convertedDetails.data,
      }, // Data to update or insert
      { new: true, upsert: true } // Return the updated document and create if it doesn't exist
    );

    console.log("Slot information upserted successfully");
    return slot;
  } catch (error) {
    console.error("Error inserting/updating slot info:", error.message);
    throw error;
  }
};

module.exports = { insertSlotInfo };
