const User = require("../models/User");
const Slot = require("../models/Slot");
const SubSlot = require("../models/SubSlot");
const Transaction = require("../models/Transaction");
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
  const user = await User.findOne({ userId });
  const slots = await Slot.find({ userId });
  const subSlots = await SubSlot.find({ userId });
  const transactions = await Transaction.find({ userId });
  return { user, slots, subSlots, transactions };
};

module.exports = { getAllUsersService, getUserByIdService };
