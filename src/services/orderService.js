const Order = require("../models/Order");
const User = require("../models/User");

const insertOrderInfo = async ({ user, level, price, transactionHash }) => {
  try {
    const userInfo = await User.findOne({ walletAddress: user });
    if (!userInfo) {
      throw new Error("User not found");
    }
    console.log("User found to insert order info", userInfo?.userId);

    userInfo.currentActiveSlot = Number(level);
    await userInfo.save();

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

    console.log("Order information upserted successfully");
    return order;
  } catch (error) {
    console.error("Error inserting/updating order info:", error.message);
    throw error;
  }
};

module.exports = {
  insertOrderInfo,
};
