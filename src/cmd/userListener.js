require("dotenv").config();
const { ethers, JsonRpcProvider } = require("ethers");
const contractAdress = process.env.CONTRACT_ADDRESS;
const contractABI = require("../../ABI/registration.json");
const rpcURL = process.env.APP_RPC;
const provider = new JsonRpcProvider(rpcURL);
const User = require("../models/User");
const { loginOrRegisterUser } = require("../services/userService");

async function userListener() {
  const contract = new ethers.Contract(contractAdress, contractABI, provider);

  console.log("Listening for UserRegistered events...");
  contract.on(
    "UserRegistered",
    async (
      userAddress,
      userId,
      registrationTime,
      referrerAddress,
      // fullName
    ) => {
      console.log("userAddress", userAddress);
      console.log("userId", userId);
      console.log("registrationTime", registrationTime);
      console.log("referrerAddress", referrerAddress);
      const userName = await contract.getUserByUserId(userId);
      fullName = userName[6]
      console.log("fullName", fullName);
      try {
        const referrer = await User.findOne({ walletAddress: referrerAddress });
        if (!referrer) {
          throw new Error("Invalid referrer address.");
        }

        const referredBy = referrer.userId;

        const { user, token, isNewUser } = await loginOrRegisterUser({
          walletAddress: userAddress,
          fullName,
          referredBy,
        });
      } catch (error) {
        console.error("Error saving to MongoDB:", error);
      }
    }
  );
}

module.exports = userListener;

// userAddress 0x6a11b91954DC3125Ae09646404E846315CD06C3F
// userId 4n
// registrationTime 1736882448n
// referrerAddress 0x0E6567ab9229f846FC8061874399d8a8703eE45c
