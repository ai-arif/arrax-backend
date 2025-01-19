const Order = require("../models/Order");
const User = require("../models/User");

const insertOrderInfo = async ({ user, level, price, transactionHash }) => {
  try {
    const userInfo = await User.findOne({ walletAddress: user });
    if (!user) {
      throw new Error("User not found");
    }
    console.log("user found to insert order info", userInfo?.userId);

    userInfo.currentActiveSlot = Number(level);
    await userInfo.save();

    const order = new Order({
      userId: userInfo?.userId,
      userAddress: user,
      level,
      price,
      transactionHash,
    });
    console.log("Order inserted successfully");
    await order.save();
    return order;
  } catch (error) {
    console.error("Error inserting order info:", error.message);
    throw error;
  }
};

module.exports = {
  insertOrderInfo,
};
