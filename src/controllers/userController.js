const {
  registerOwner,
  loginOrRegisterUser,
} = require("../services/userService");
const sendResponse = require("../utils/sendResponse");

/**
 * Controller to register the owner.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

/**
 * Controller to handle user login or registration.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
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

module.exports = { handleOwnerRegistration, handleLoginOrRegistration };
