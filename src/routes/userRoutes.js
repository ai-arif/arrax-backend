const express = require("express");
const { handleLoginOrRegistration } = require("../controllers/userController");

const router = express.Router();

// Login or register route
router.post("/connect-wallet", handleLoginOrRegistration);

module.exports = router;
