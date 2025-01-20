const sendResponse = require("../utils/sendResponse");
const {
  getAllUsersService,
  getUserByIdService,
  getSettingsStatus,
  updateRegistrationStatus,
  updatePurchasingStatus,
} = require("../services/adminService");

const getAllUsers = async (req, res) => {
  // handle with proper pagination and search by fullName and walletAddress
  try {
    const { walletAddress, fullName, page, limit } = req.query;
    const result = await getAllUsersService(
      walletAddress,
      fullName,
      page,
      limit
    );
    return sendResponse(res, 200, true, "Users found.", result);
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};

const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await getUserByIdService(userId);
    return sendResponse(res, 200, true, "User found.", result);
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};

const getSettings = async (req, res) => {
  try {
    const result = await getSettingsStatus();
    return sendResponse(res, 200, true, "Settings found.", result);
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};

const updateRegistration = async (req, res) => {
  try {
    const { registration } = req.body;
    const result = await updateRegistrationStatus(registration);
    return sendResponse(res, 200, true, "Registration status updated.", result);
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};
const updatePurchasing = async (req, res) => {
  try {
    const { purchasing } = req.body;
    const result = await updatePurchasingStatus(purchasing);
    return sendResponse(res, 200, true, "Purchasing status updated.", result);
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  getSettings,
  updateRegistration,
  updatePurchasing,
};
