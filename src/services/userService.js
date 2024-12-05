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
  const slotPrices = Slot.slotPrices;
  for (let i = 1; i <= 10; i++) {
    await Slot.create({
      userId: user.userId,
      slotNumber: i,
      isActive: true, // Activate only the first slot
      price: slotPrices[i - 1], // Assign corresponding slot price
    });
  }

  const token = generateToken({
    userId: user.userId,
    walletAddress: user.walletAddress,
  });

  return { user, token };
};

const loginOrRegisterUser = async ({ walletAddress, fullName, referredBy }) => {
  // Check if the user is already registered
  let user = await User.findOne({ walletAddress });

  if (user) {
    const token = generateToken({
      userId: user.userId,
      walletAddress: user.walletAddress,
    });
    return { user, token, isNewUser: false };
  }

  // Registration logic for new users
  if (!referredBy || !fullName) {
    throw new Error("Full name and referral ID are required for registration.");
  }

  // Validate the referral ID
  const referrer = await User.findOne({ userId: referredBy });
  if (!referrer) {
    throw new Error("Invalid referral ID.");
  }

  // Generate a new user ID
  const nextUserId = await getNextSequence("userId");

  // Create the new user
  user = await User.create({
    userId: nextUserId,
    fullName,
    walletAddress,
    referredBy,
    isOwner: false,
  });

  // Update the referrer's direct referrals and total team count
  referrer.directReferrals.push(user.userId);
  referrer.totalTeam += 1;

  // Update generation data for up to 10 levels
  let currentReferrer = referrer;
  for (let level = 1; level <= 10 && currentReferrer; level++) {
    const slot = await Slot.findOne({
      userId: currentReferrer.userId,
      slotNumber: 1,
    });
    if (slot) {
      const generation = slot.generationData.find(
        (gen) => gen.generationLevel === level
      );
      if (generation) {
        generation.count += 1;
      } else {
        slot.generationData.push({ generationLevel: level, count: 1 });
      }
      await slot.save();
    }
    currentReferrer = await User.findOne({
      userId: currentReferrer.referredBy,
    });
  }

  await referrer.save();

  // Create slots for the new user (all slots initially blocked)
  const slotPrices = Slot.slotPrices; // Ensure slot prices are defined in the Slot model

  for (let i = 1; i <= 10; i++) {
    await Slot.create({
      userId: user.userId,
      slotNumber: i,
      isActive: false, // All slots are blocked initially
      price: slotPrices[i - 1], // Assign slot price based on slot number
    });
  }

  // Generate a token for the new user
  const token = generateToken({
    userId: user.userId,
    walletAddress: user.walletAddress,
  });

  return { user, token, isNewUser: true };
};

module.exports = { registerOwner, loginOrRegisterUser };
