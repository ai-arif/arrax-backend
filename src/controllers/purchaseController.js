const sendResponse = require("../utils/sendResponse");

// makePurchase
const makePurchaseController = async (req, res) => {
  try {
    const { userId, slotId, amount } = req.body;

    if (!userId || !slotId || !amount) {
      return sendResponse(
        res,
        400,
        false,
        "User ID, slot ID, and amount are required.",
        null
      );
    }

    const result = await makePurchase({ userId, slotId, amount });
    return sendResponse(res, 201, true, "Purchase successful.", result);
  } catch (error) {
    return sendResponse(res, 500, false, error.message, null);
  }
};

module.exports = { makePurchaseController };
