const { getUserSlot } = require("../controllers/bookingContractController");
const Order = require("../models/Order");
const User = require("../models/User");

const insertOrderInfo = async ({ user, level, price, transactionHash }) => {
  try {
    const userInfo = await User.findOne({ walletAddress: user });
    if (!userInfo) {
      throw new Error("User not found");
    }
    console.log("User found to insert order info", userInfo?.userId);
    const slotInfo = await getUserSlot(userInfo.walletAddress);
    userInfo.currentActiveSlot = slotInfo?.activeSlot;
    await userInfo.save();
    console.log("Current active slot", userInfo?.currentActiveSlot);

    // Upsert logic: find an existing order or create a new one
    const order = await Order.findOneAndUpdate(
      { userId: userInfo?.userId, level }, // Filter by userId and level
      {
        userId: userInfo?.userId,
        userAddress: user,
        level,
        price,
        transactionHash,
      }, // Data to update or insert
      { new: true, upsert: true } // Return the updated document and create if it doesn't exist
    );

    if (userInfo?.isActive == false) {
      updateActiveTeamCount(userInfo?.userId);
    }

    console.log("Order information upserted successfully");

    return order;
  } catch (error) {
    console.error("Error inserting/updating order info:", error.message);
    throw error;
  }
};

// activeTeam, recursively visit and update all by referredBy field, until you reach the owner where referredBy is null
const updateActiveTeamCount = async (userId) => {
  const user = await User.findOne({ userId });
  if (!user) {
    throw new Error("User not found");
  }
  if (user.referredBy) {
    const referredByUser = await User.findOne({ userId: user.referredBy });
    if (!referredByUser) {
      throw new Error("Referred by user not found");
    }
    referredByUser.activeTeam = referredByUser.activeTeam + 1;
    await referredByUser.save();
    await updateActiveTeamCount(referredByUser.userId);
  }
};

module.exports = {
  insertOrderInfo,
};
