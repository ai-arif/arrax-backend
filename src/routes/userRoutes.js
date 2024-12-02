const express = require("express");
const {
  handleLoginOrRegistration,
  handleOwnerRegistration,
} = require("../controllers/userController");

const router = express.Router();

// Login or register route
router.post("/connect-wallet", handleLoginOrRegistration);
router.post("/register-owner", handleOwnerRegistration);

module.exports = router;
