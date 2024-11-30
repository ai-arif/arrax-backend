const { loginOrRegisterUser } = require("../services/userService");
const sendResponse = require("../utils/sendResponse");

// Handle login and registration
const handleLoginOrRegistration = async (req, res) => {
  try {
    const { walletAddress, fullName, referredBy } = req.body;

    if (!walletAddress) {
      return sendResponse(res, 400, false, "Wallet address is required", null);
    }

    // Call service to handle login or registration
    const result = await loginOrRegisterUser({
      walletAddress,
      fullName,
      referredBy,
    });

    if (result.isNewUser) {
      return sendResponse(res, 201, true, "Registration successful", {
        user: result.user,
        token: result.token,
      });
    } else {
      return sendResponse(res, 200, true, "Login successful", {
        user: result.user,
        token: result.token,
      });
    }
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};

module.exports = { handleLoginOrRegistration };
