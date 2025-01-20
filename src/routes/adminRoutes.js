const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  getSettings,
} = require("../controllers/adminController");
// get all users,
router.get("/users", getAllUsers);
// get single user by id
router.get("/user/:userId", getUserById);
// get settings
router.get("/settings", getSettings);

module.exports = router;
