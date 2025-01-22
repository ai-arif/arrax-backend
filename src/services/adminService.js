const User = require("../models/User");
const Slot = require("../models/Slot");
const SubSlot = require("../models/SubSlot");
const Transaction = require("../models/Transaction");
const {
  isPaused,
  pauseContract,
  unpauseContract,
} = require("../controllers/RegisterationContractController");
const {
  isPurchasePaused,
  purchasePause,
  purchaseUnpause,
} = require("../controllers/bookingContractController");
// take walletAddress and fullName also page and limit
const getAllUsersService = async (
  walletAddress,
  fullName,
  page = 1,
  limit = 30
) => {
  const skip = (page - 1) * limit;

  // Build the search criteria conditionally
  const searchCriteria = {};
  if (fullName) {
    searchCriteria.fullName = { $regex: fullName, $options: "i" };
  }
  if (walletAddress) {
    searchCriteria.walletAddress = { $regex: walletAddress, $options: "i" };
  }

  // Count total users matching the search criteria
  const totalUsers = await User.countDocuments(
    Object.keys(searchCriteria).length ? { $or: [searchCriteria] } : {}
  );

  const totalPages = Math.ceil(totalUsers / limit);
  const currentPage = page;

  // Find users with pagination and search criteria
  const users = await User.find(
    Object.keys(searchCriteria).length ? { $or: [searchCriteria] } : {}
  )
    .skip(skip)
    .limit(limit);

  return { users, currentPage, totalPages, totalUsers };
};

// single userId will be passed, return everything about the user
const getUserByIdService = async (userId) => {
  try {
    // Fetch user details
    const user = await User.findOne({ userId });

    // Fetch slots with their corresponding subslots
    const slotsWithSubSlots = await Slot.aggregate([
      {
        $match: { userId: parseInt(userId) },
      },
      {
        $lookup: {
          from: "subslots",
          localField: "subSlotIds",
          foreignField: "_id",
          as: "subSlots",
        },
      },
      {
        $unwind: "$subSlots",
      },
      {
        $sort: {
          slotNumber: 1,
          "subSlots.subSlotNumber": 1,
        },
      },
      {
        $group: {
          _id: "$_id",
          userId: { $first: "$userId" },
          slotNumber: { $first: "$slotNumber" },
          isActive: { $first: "$isActive" },
          sectionsCompleted: { $first: "$sectionsCompleted" },
          price: { $first: "$price" },
          recycleCount: { $first: "$recycleCount" },
          recycleUserCount: { $first: "$recycleUserCount" },
          usersCount: { $first: "$usersCount" },
          referrals: { $first: "$referrals" },
          generationData: { $first: "$generationData" },
          subSlots: { $push: "$subSlots" },
        },
      },
      {
        $sort: {
          slotNumber: 1,
        },
      },
    ]);

    // Fetch transactions
    const transactions = await Transaction.find({ userId });

    // Combine all data into a single response
    return {
      user,
      slots: slotsWithSubSlots,
      transactions,
    };
  } catch (error) {
    console.error("Error fetching user dashboard data:", error);
    throw new Error("Error fetching user dashboard data");
  }
};

//
const getSettingsStatus = async () => {
  try {
    const isRegistrationPaused = await isPaused();
    const isPurchasingPaused = await isPurchasePaused();
    return {
      isRegistrationPaused: isRegistrationPaused.data,
      isPurchasingPaused: isPurchasingPaused.data,
    };
  } catch (error) {
    console.error("Error fetching settings:", error);
    throw new Error("Error fetching settings");
  }
};

// updateRegistraion
const updateRegistrationStatus = async (status) => {
  // true or false
  console.log(status);
  if (status) {
    await unpauseContract();
  } else {
    await pauseContract();
  }
  return true;
};

const updatePurchasingStatus = async (status) => {
  console.log(status);
  // true or false
  if (status) {
    await purchaseUnpause();
  } else {
    await purchasePause();
  }
  return true;
};

module.exports = {
  getAllUsersService,
  getUserByIdService,
  getSettingsStatus,
  updateRegistrationStatus,
  updatePurchasingStatus,
};
