const express = require("express");
const router = express.Router();
const { getAllUsers, getUserById } = require("../controllers/adminController");
// get all users,
router.get("/", getAllUsers);
// get single user by id
router.get("/:id", getUserById);

module.exports = router;
