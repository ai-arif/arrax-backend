const Order = require("../models/Order");
const User = require("../models/User");

const insertOrderInfo = async ({ user, level, price, transactionHash }) => {
  try {
    const userInfo = await User.findOne({ walletAddress: user });
    if (!user) {
      throw new Error("User not found");
    }

    userInfo.currentActiveSlot = Number(level);
    await userInfo.save();

    const order = new Order({
      userId: userInfo?.userId,
      userAddress: user,
      level,
      price,
      transactionHash,
    });
    await order.save();
    return order;
  } catch (error) {
    console.error("Error inserting order info:", error);
    throw error;
  }
};

module.exports = {
  insertOrderInfo,
};
