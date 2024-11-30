const User = require("../models/User");
const Slot = require("../models/Slot");
const jwt = require("jsonwebtoken");

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

// Login or register a user
const loginOrRegisterUser = async ({ walletAddress, fullName, referredBy }) => {
  // Check if the user exists
  let user = await User.findOne({ walletAddress });

  if (user) {
    // If user exists, generate a login token
    const token = jwt.sign(
      { userId: user.userId, walletAddress: user.walletAddress },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    return { user, token, isNewUser: false };
  }

  // If user does not exist, ensure referral ID and full name are provided
  if (!referredBy || !fullName) {
    throw new Error("ReferredBy and fullName are required for registration");
  }

  // Check if the referredBy user exists
  const referrer = await User.findOne({ userId: referredBy });
  if (!referrer) {
    throw new Error("Invalid referral ID");
  }

  // Determine if the new user is the owner
  const isOwner = (await User.countDocuments()) === 0;

  // Create the new user
  user = await User.create({
    fullName,
    walletAddress,
    referredBy,
    isOwner,
  });

  // Add the new user to the referrer's direct referrals
  referrer.directReferrals.push(user.userId);
  referrer.totalTeam += 1;
  await referrer.save();

  // Automatically create slots for the new user
  for (let i = 1; i <= 10; i++) {
    await Slot.create({
      userId: user.userId,
      slotNumber: i,
      isActive: i === 1, // Activate the first slot by default
    });
  }

  // Generate a login token for the new user
  const token = jwt.sign(
    { userId: user.userId, walletAddress: user.walletAddress },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  return { user, token, isNewUser: true };
};

module.exports = { loginOrRegisterUser };
