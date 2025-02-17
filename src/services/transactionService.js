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
    if (!fromUser) {
      throw new Error("From user not found");
    }

    // Use $setOnInsert so that fields are only set when creating a new document.
    // Also, use rawResult to check if the document was newly inserted.
    const result = await Transaction.findOneAndUpdate(
      {
        receiverId: userInfo.userId,
        fromId: fromUser.userId,
        amount,
        level,
      },
      {
        $setOnInsert: {
          receiverId: userInfo.userId,
          receiver: user,
          from,
          fromId: fromUser.userId,
          amount,
          level,
          incomeType,
          transactionHash,
        },
      },
      { new: true, upsert: true, rawResult: true }
    );

    // Check if the transaction was inserted new.
    const isNewTransaction = !result.lastErrorObject.updatedExisting;
    console.log("Is new transaction:", isNewTransaction);

    if (isNewTransaction) {
      // Update daily income fields only if the transaction is new.
      if (incomeType === "direct") {
        userInfo.dailyDirectIncome = (userInfo.dailyDirectIncome || 0) + amount;
        userInfo.dailyTotalIncome = (userInfo.dailyTotalIncome || 0) + amount;
      } else if (incomeType === "level") {
        userInfo.dailyLevelIncome = (userInfo.dailyLevelIncome || 0) + amount;
        userInfo.dailyTotalIncome = (userInfo.dailyTotalIncome || 0) + amount;
      }
    } else {
      console.log("Transaction already exists. Skipping income update.");
    }
    // Refresh income details for the receiver.
    const receiverIncome = await getUserIncome(userInfo.walletAddress);
    userInfo.income = {
      ...userInfo.income,
      ...receiverIncome.data,
    };
    userInfo.isActive = true;
    await userInfo.save();

    // Refresh income details for the sender.
    const fromIncome = await getUserIncome(fromUser.walletAddress);
    fromUser.income = {
      ...fromUser.income,
      ...fromIncome.data,
    };
    await fromUser.save();

    return result.value;
  } catch (error) {
    console.error("Error inserting transaction:", error);
    throw error;
  }
};

module.exports = { insertTransaction };
