const {
  registerOwner,
  loginOrRegisterUser,
  getUserById,
  getGenerationLevels,
} = require("../services/userService");
const sendResponse = require("../utils/sendResponse");

const handleOwnerRegistration = async (req, res) => {
  try {
    const { walletAddress, fullName } = req.body;

    if (!walletAddress || !fullName) {
      return sendResponse(
        res,
        400,
        false,
        "Wallet address and full name are required.",
        null
      );
    }

    const result = await registerOwner({ walletAddress, fullName });
    return sendResponse(
      res,
      201,
      true,
      "Owner registration successful.",
      result
    );
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};

const handleLoginOrRegistration = async (req, res) => {
  try {
    const { walletAddress, fullName, referredBy } = req.body;

    if (!walletAddress) {
      return sendResponse(res, 400, false, "Wallet address is required.", null);
    }

    const result = await loginOrRegisterUser({
      walletAddress,
      fullName,
      referredBy,
    });

    if (result.isNewUser) {
      return sendResponse(
        res,
        201,
        true,
        "User registration successful.",
        result
      );
    } else {
      return sendResponse(res, 200, true, "Login successful.", result);
    }
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};

const handleGetUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserById(userId);

    if (!user) {
      return sendResponse(res, 404, false, "User not found.", null);
    }

    return sendResponse(res, 200, true, "User found.", user);
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};

const getUserGenerationLevels = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const levels = await getGenerationLevels(parseInt(userId, 10));

    if (levels.length === 0) {
      return res
        .status(404)
        .json({ message: "User not found or no referral chain exists." });
    }

    return res.status(200).json({ levels });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "An error occurred.", error: error.message });
  }
};

module.exports = {
  handleOwnerRegistration,
  handleLoginOrRegistration,
  handleGetUserById,
  getUserGenerationLevels,
};
