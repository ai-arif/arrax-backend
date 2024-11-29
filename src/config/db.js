const mongoose = require("mongoose");
require("dotenv").config(); // To load environment variables from .env file

// Get the database URL from the environment variables
const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  throw new Error("DB_URL is not defined in .env file");
}

// Function to connect to the database
const connectDB = async () => {
  try {
    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exit(1); // Exit the process with failure code
  }
};

module.exports = connectDB;
