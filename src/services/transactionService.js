const Transaction = require("../models/Transaction");
const User = require("../models/User");

const insertTransaction = async ({
  user,
  from,
  amount,
  level,
  incomeType,
  transactionHash,
}) => {
  try {
    const user = await User.findOne({ walletAddress: user });
    if (!user) {
      throw new Error("User not found");
    }
    const fromUser = await User.findOne({ walletAddress: from });
    const transaction = await Transaction.create({
      receiverId: user?.userId,
      receiver: user,
      from,
      fromId: fromUser?.userId,
      amount,
      level,
      incomeType,
      transactionHash,
    });
    return transaction;
  } catch (error) {
    console.error("Error inserting transaction:", error);
    throw error;
  }
};

module.exports = { insertTransaction };
