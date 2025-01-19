const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const Slot = require("../models/Slot");
const SubSlot = require("../models/SubSlot");
const { generateToken } = require("./tokenService");
const { getCurrentSlot } = require("../controllers/bookingContractController");
const getNextSequence = require("../utils/getNextSequence");
const {
  getUserIncome,
  getUserStats,
} = require("../controllers/bookingContractController");

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
    console.log(
      "userId",
      userId,
      walletAddress,
      fullName,
      referredBy,
      referrerAddress
    );
    let user = await User.findOne({ walletAddress });

    if (user) {
      const token = generateToken({
        userId: user.userId,
        walletAddress: user.walletAddress,
        roles: user?.roles,
      });
      console.log("getting user income");
      const incomeData = await getUserIncome(walletAddress);
      console.log("getting user stats");
      // const userStats = await getUserStats(walletAddress);

      user.income = {
        ...user.income,
        ...incomeData.data,
      };
      console.log("income", user.income);
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
    if (!referrer) {
      throw new Error("Invalid referral ID.");
    }

    // Generate a new user ID
    // const nextUserId = await getNextSequence("userId");

    // Create the new user
    user = await User.create({
      userId,
      fullName,
      walletAddress,
      referredBy,
      referrerAddress,
      isOwner: false,
    });

    // Update the referrer's direct referrals and total team count
    referrer.directReferrals.push(user.userId);
    referrer.totalTeam += 1;
    referrer.totalPartners += 1;

    await referrer.save();

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

const processImage = async (buffer, user) => {
  try {
    console.log("Processing image...");

    // Generate processed image path
    const processedPath = path.join(uploadDir, `processed-${Date.now()}.webp`);

    // Use Sharp to process the image
    await sharp(buffer)
      .resize(800) // Resize image to 800px width (maintaining aspect ratio)
      .toFormat("webp") // Convert to webp format
      .toFile(processedPath);

    const publicUrl = `${process.env.APP_URL}/uploads/${path.basename(
      processedPath
    )}`;
    // Update the user's image field
    user.image = publicUrl;
    await user.save();

    return publicUrl;
  } catch (error) {
    console.error("Error processing image:", error.message);
    throw new Error("Failed to process image.");
  }
};

const getSlotsWithSubSlots = async (userId) => {
  try {
    // const slotsWithSubSlots = await Slot.aggregate([
    //   {
    //     $match: { userId: parseInt(userId) },
    //   },
    //   {
    //     $lookup: {
    //       from: "subslots",
    //       localField: "subSlotIds",
    //       foreignField: "_id",
    //       as: "subSlots",
    //     },
    //   },
    //   {
    //     $unwind: "$subSlots",
    //   },
    //   {
    //     $sort: {
    //       slotNumber: 1, // Sort by slotNumber
    //       "subSlots.subSlotNumber": 1, // Sort subSlots by subSlotNumber
    //     },
    //   },
    //   {
    //     $group: {
    //       _id: "$_id",
    //       userId: { $first: "$userId" },
    //       slotNumber: { $first: "$slotNumber" },
    //       isActive: { $first: "$isActive" },
    //       sectionsCompleted: { $first: "$sectionsCompleted" },
    //       price: { $first: "$price" },
    //       recycleCount: { $first: "$recycleCount" },
    //       recycleUserCount: { $first: "$recycleUserCount" },
    //       usersCount: { $first: "$usersCount" },
    //       referrals: { $first: "$referrals" },
    //       generationData: { $first: "$generationData" },
    //       subSlots: { $push: "$subSlots" }, // Reassemble the sorted subSlots array
    //     },
    //   },
    //   {
    //     $sort: {
    //       slotNumber: 1, // Ensure the final response is sorted by slotNumber
    //     },
    //   },
    // ]);

    // return slotsWithSubSlots;
    const user = await User.findOne({ userId: parseInt(userId) });

    if (!user) {
      throw new Error("User not found");
    }
    const currentSlot = await getCurrentSlot(user.walletAddress);

    return currentSlot;
  } catch (error) {
    console.error("Error fetching slots and subSlots:", error);
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
