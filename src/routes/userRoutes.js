const express = require("express");
const {
  handleLoginOrRegistration,
  handleOwnerRegistration,
  handleGetUserById,
  getUserGenerationLevels,
} = require("../controllers/userController");

const router = express.Router();

// Login or register route
router.post("/connect-wallet", handleLoginOrRegistration);
router.post("/register-owner", handleOwnerRegistration);
router.get("/user/:userId/generations", getUserGenerationLevels);
router.get("/user/:userId", handleGetUserById);

module.exports = router;
