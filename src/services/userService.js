const User = require("../models/User");
const Slot = require("../models/Slot");
const { generateToken } = require("./tokenService");
const getNextSequence = require("../utils/getNextSequence");

const registerOwner = async ({ walletAddress, fullName }) => {
  const existingOwner = await User.findOne({ isOwner: true });
  if (existingOwner) {
    throw new Error("An owner already exists. Only one owner is allowed.");
  }

  const user = await User.create({
    fullName,
    walletAddress,
    referredBy: null, // No referrer for the owner
    isOwner: true,
    userId: 1, // Set userId to 1 for the owner
  });

  // Create slots for the owner
  for (let i = 1; i <= 10; i++) {
    await Slot.create({
      userId: user.userId,
      slotNumber: i,
      isActive: i === 1,
    });
  }

  const token = generateToken({
    userId: user.userId,
    walletAddress: user.walletAddress,
  });

  return { user, token };
};

const loginOrRegisterUser = async ({ walletAddress, fullName, referredBy }) => {
  let user = await User.findOne({ walletAddress });

  if (user) {
    const token = generateToken({
      userId: user.userId,
      walletAddress: user.walletAddress,
    });
    return { user, token, isNewUser: false };
  }

  if (!referredBy || !fullName) {
    throw new Error("Full name and referral ID are required for registration.");
  }

  const referrer = await User.findOne({ userId: referredBy });
  if (!referrer) {
    throw new Error("Invalid referral ID.");
  }

  const nextUserId = await getNextSequence("userId"); // Fetch the next userId

  user = await User.create({
    userId: nextUserId,
    fullName,
    walletAddress,
    referredBy,
    isOwner: false,
  });

  referrer.directReferrals.push(user.userId);
  referrer.totalTeam += 1;
  await referrer.save();

  for (let i = 1; i <= 10; i++) {
    await Slot.create({
      userId: user.userId,
      slotNumber: i,
      isActive: i === 1,
    });
  }

  const token = generateToken({
    userId: user.userId,
    walletAddress: user.walletAddress,
  });

  return { user, token, isNewUser: true };
};

module.exports = { registerOwner, loginOrRegisterUser };
