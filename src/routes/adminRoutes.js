const express = require("express");
const router = express.Router();
const { getAllUsers, getUserById } = require("../controllers/adminController");
// get all users,
router.get("/users", getAllUsers);
// get single user by id
router.get("/user/:id", getUserById);

module.exports = router;
