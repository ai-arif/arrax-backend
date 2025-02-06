const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const Slot = require("../models/Slot");
const { generateToken } = require("./tokenService");
const { getUserSlot } = require("../controllers/bookingContractController");
// const getNextSequence = require("../utils/getNextSequence");
const { getUserIncome } = require("../controllers/bookingContractController");
// const { insertOrderInfo } = require("./orderService");

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
    roles: ["user", "admin"],
    userId: 1, // Set userId to 1 for the owner
  });

  const token = generateToken({
    userId: user.userId,
    walletAddress: user.walletAddress,
    roles: user?.roles,
  });

  return { user, token };
};

// {
//   userId: new BN(userId).toNumber(),
//   walletAddress: userAddress,
//   fullName,
//   referredBy: reffererId,
//   referrerAddress,
// }
const loginOrRegisterUser = async ({
  userId,
  walletAddress,
  fullName,
  referredBy,
  referrerAddress,
}) => {
  try {
    let user = await User.findOne({ walletAddress });

    if (user) {
      const token = generateToken({
        userId: user.userId,
        walletAddress: user.walletAddress,
        roles: user?.roles,
      });
      // console.log("getting user income");
      const incomeData = await getUserIncome(walletAddress);
      // console.log("getting user stats");
      // const userStats = await getUserStats(walletAddress);

      user.income = {
        ...user.income,
        ...incomeData.data,
      };

      await user.save();

      return { user, token, isNewUser: false };
    }

    // Registration logic for new users
    if (!referredBy || !fullName) {
      throw new Error(
        "Full name and referral ID are required for registration."
      );
    }

    // Validate the referral ID
    const referrer = await User.findOne({ userId: referredBy });

    user = await User.create({
      userId,
      fullName,
      walletAddress,
      referredBy,
      referrerAddress,
      isOwner: false,
      currentActiveSlot: 0,
    });

    console.log("user registered successfully", user);

    // Update the referrer's direct referrals and total team count
    // referrer.directReferrals.push(user.userId);
    referrer.totalTeam += 1;
    referrer.totalPartners += 1;
    referrer.dailyTeam += 1;
    referrer.dailyPartners += 1;

    await referrer.save();
    updateReferrerTeam(referredBy, 1);

    // Generate a token for the new user
    const token = generateToken({
      userId: user.userId,
      walletAddress: user.walletAddress,
    });

    return { user, token, isNewUser: true };
  } catch (error) {
    console.error("Error registering user:", error.message);
    throw error;
  }
};

const updateReferrerTeam = async (userId, team) => {
  // loop recursively through the referredBy, and increase everyone's team count, until you reach the owner where referredBy is null
  let user = await User.findOne({ userId });
  while (user.referredBy !== null) {
    user = await User.findOne({ userId: user.referredBy });
    user.totalTeam += team;
    user.dailyPartners += team;
    await user.save();
  }
};

// get user information by userId
const getUserById = async (userId) => {
  const user = await User.findOne({ userId });
  return user;
};

const getGenerationLevels = async (userId) => {
  const levels = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    count: 0,
    active: 0,
    inactive: 0,
    users: [],
  }));

  let currentUserIds = [userId]; // Start with the given user
  let visitedUserIds = new Set(); // To avoid processing the same user multiple times

  for (let levelIndex = 0; levelIndex < 10; levelIndex++) {
    if (currentUserIds.length === 0) break; // Stop if there are no more users at the current level

    const referrals = await User.find({
      referredBy: { $in: currentUserIds },
    }).lean();

    const levelData = levels[levelIndex];

    for (const user of referrals) {
      if (!visitedUserIds.has(user.userId)) {
        visitedUserIds.add(user.userId);
        levelData.users.push({
          userId: user.userId,
          fullName: user.fullName,
          walletAddress: user.walletAddress,
        });

        if (user.isActive) {
          levelData.active++;
        } else {
          levelData.inactive++;
        }
      }
    }

    levelData.count = levelData.users.length;
    currentUserIds = referrals.map((user) => user.userId); // Move to the next level
  }

  return levels;
};

// Ensure the uploads directory exists or create it
const uploadDir = path.resolve(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const processImage = async (buffer, userId, fullName) => {
  try {
    let processedPath = null;

    if (buffer) {
      // Generate processed image path
      processedPath = path.join(uploadDir, `processed-${Date.now()}.webp`);

      // Use Sharp to process the image
      await sharp(buffer)
        .resize(800) // Resize image to 800px width (maintaining aspect ratio)
        .toFormat("webp") // Convert to webp format
        .toFile(processedPath);
    }

    const publicUrl = processedPath
      ? `${process.env.APP_URL}/uploads/${path.basename(processedPath)}`
      : null;

    // Update user data in DB
    const updateData = {};
    if (publicUrl) updateData.image = publicUrl;
    if (fullName) updateData.fullName = fullName;

    if (Object.keys(updateData).length > 0) {
      await User.updateOne({ userId }, { $set: updateData });
    }

    return publicUrl;
  } catch (error) {
    console.error("Error processing image:", error.message);
    throw new Error("Failed to process image.");
  }
};

const getSlotsWithSubSlots = async (userId) => {
  try {
    const user = await User.findOne({ userId: parseInt(userId) });

    if (!user) {
      throw new Error("User not found");
    }
    // if (user?.isOwner) {
    //   const stats = await getAdminStats();
    //   console.log("stats getting ", stats);
    // }

    const slotInfo = await getUserSlot(user?.walletAddress);
    const currentSlot = {
      success: true,
      activeSlot: slotInfo.activeSlot,
    };

    // const slotDetails = [];
    const slotDetails = await Slot.find({ userId: user.userId }).sort({
      slot: 1,
    });

    // if (activeSlot > 0) {
    //   for (let i = 0; i < activeSlot; i++) {
    //     const levelReferralDetails = await getLevelReferralDetails(
    //       user.walletAddress,
    //       i + 1
    //     );

    //     // Convert BigInt fields to string
    //     const convertedDetails = JSON.parse(
    //       JSON.stringify(levelReferralDetails, (_, value) =>
    //         typeof value === "bigint" ? value.toString() : value
    //       )
    //     );

    //     slotDetails.push({ slot: i + 1, data: convertedDetails?.data });
    //   }
    // }

    // Optionally, add slotDetails to currentSlot for reference
    currentSlot.slotDetails = slotDetails;

    return currentSlot;
  } catch (error) {
    console.error("Error fetching slots and subSlots:", error);
    throw error;
  }
};

module.exports = {
  registerOwner,
  loginOrRegisterUser,
  getUserById,
  getGenerationLevels,
  processImage,
  getSlotsWithSubSlots,
};
