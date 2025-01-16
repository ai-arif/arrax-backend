const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const Slot = require("../models/Slot");
const SubSlot = require("../models/SubSlot");
const { generateToken } = require("./tokenService");
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
    roles: user?.roles,
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
      roles: user?.roles,
    });
    console.log("getting user income");
    const incomeData = await getUserIncome(walletAddress);
    console.log("getting user stats");
    const userStats = await getUserStats(walletAddress);

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
  referrer.totalPartners += 1;

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

  // Create slots and sub-slots for the new user
  const slotPrices = Slot.slotPrices;

  const slots = [];
  const subSlots = [];

  for (let i = 1; i <= 10; i++) {
    // Prepare slot data
    const slotData = {
      userId: user.userId,
      slotNumber: i,
      isActive: false, // All slots are blocked initially
      price: slotPrices[i - 1], // Assign slot price based on slot number
    };
    slots.push(slotData);
  }

  // Create all slots in a single database call
  const createdSlots = await Slot.insertMany(slots);

  // Prepare sub-slot data for each created slot
  createdSlots.forEach((slot) => {
    for (let j = 1; j <= 12; j++) {
      subSlots.push({
        slotId: slot._id,
        subSlotNumber: j,
        isPurchased: false, // Initial state
      });
    }
  });

  // Create all sub-slots in a single database call
  const createdSubSlots = await SubSlot.insertMany(subSlots);

  // Map and update slot documents with their corresponding sub-slot IDs
  await Promise.all(
    createdSlots.map(async (slot) => {
      const subSlotIds = createdSubSlots
        .filter((subSlot) => subSlot.slotId.toString() === slot._id.toString())
        .map((subSlot) => subSlot._id);

      // Update the slot document with subSlotIds
      await Slot.updateOne(
        { _id: slot._id },
        { $set: { subSlotIds: subSlotIds } }
      );
    })
  );

  // Generate a token for the new user
  const token = generateToken({
    userId: user.userId,
    walletAddress: user.walletAddress,
  });

  return { user, token, isNewUser: true };
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
    const slotsWithSubSlots = await Slot.aggregate([
      {
        $match: { userId: parseInt(userId) }, // Match slots for the specific userId
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
          slotNumber: 1, // Sort by slotNumber
          "subSlots.subSlotNumber": 1, // Sort subSlots by subSlotNumber
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
          subSlots: { $push: "$subSlots" }, // Reassemble the sorted subSlots array
        },
      },
      {
        $sort: {
          slotNumber: 1, // Ensure the final response is sorted by slotNumber
        },
      },
    ]);

    return slotsWithSubSlots;
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
