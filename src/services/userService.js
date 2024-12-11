const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const Slot = require("../models/Slot");
const SubSlot = require("../models/SubSlot");
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
  await SubSlot.insertMany(subSlots);

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
  const levels = [];
  let currentUserId = userId;
  let level = 1;

  while (currentUserId) {
    const user = await User.findOne({ userId: currentUserId }).lean();
    if (!user) break;

    // Fetch referrer and exclude the current user
    const referrer = await User.findOne({ userId: user.referredBy }).lean();
    if (referrer) {
      levels.push({
        level,
        userId: referrer.userId,
        fullName: referrer.fullName,
        walletAddress: referrer.walletAddress,
        income: referrer.income,
      });
    }

    currentUserId = user.referredBy; // Move up the referral chain
    level++; // Increment the level
  }

  return levels.sort((a, b) => a.level - b.level); // Ensure levels are sorted
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

const getSlotWithSubSlots = async (userId) => {
  try {
    const result = await Slot.aggregate([
      {
        $match: { userId: userId }, // Filter slots by userId
      },
      {
        $lookup: {
          from: "subslots", // Collection name of SubSlot (usually pluralized automatically by Mongoose)
          localField: "_id", // Field in Slot to match
          foreignField: "slotId", // Field in SubSlot to match
          as: "subSlots", // Resulting array field in the output
        },
      },
      {
        $project: {
          slotNumber: 1,
          isActive: 1,
          sectionsCompleted: 1,
          price: 1,
          referrals: 1,
          generationData: 1,
          recycleCount: 1,
          recycleUserCount: 1,
          usersCount: 1,
          subSlots: 1, // Include the joined subSlots
        },
      },
    ]);

    return result;
  } catch (error) {
    console.error("Error fetching slots with sub-slots:", error);
    throw error;
  }
};

module.exports = {
  registerOwner,
  loginOrRegisterUser,
  getUserById,
  getGenerationLevels,
  processImage,
  getSlotWithSubSlots,
};
