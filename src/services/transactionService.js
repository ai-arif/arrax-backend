const { getUserIncome } = require("../controllers/bookingContractController");
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
    const userInfo = await User.findOne({ walletAddress: user });
    if (!userInfo) {
      throw new Error("User not found");
    }
    const fromUser = await User.findOne({ walletAddress: from });
    const transaction = await Transaction.create({
      receiverId: userInfo?.userId,
      receiver: user,
      from,
      fromId: fromUser?.userId,
      amount,
      level,
      incomeType,
      transactionHash,
    });
    const receiverIncome = await getUserIncome(userInfo?.walletAddress);
    const fromIncome = await getUserIncome(fromUser?.walletAddress);
    userInfo.income = {
      ...userInfo.income,
      ...receiverIncome.data,
    };
    await userInfo.save();
    fromUser.income = {
      ...fromUser.income,
      ...fromIncome.data,
    };
    await fromUser.save();
    return transaction;
  } catch (error) {
    console.error("Error inserting transaction:", error);
    throw error;
  }
};

module.exports = { insertTransaction };
