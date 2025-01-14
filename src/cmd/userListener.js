require("dotenv").config();
const { ethers, JsonRpcProvider } = require('ethers');
const contractAdress = process.env.CONTRACT_ADDRESS
const contractABI = require("../../ABI/registration.json")
const rpcURL = process.env.APP_RPC
const provider = new JsonRpcProvider(rpcURL);

async function userListener() {

    const contract = new ethers.Contract(contractAdress, contractABI, provider);
  
    console.log("Listening for UserRegistered events..." ,);
    contract.on("UserRegistered", async (userAddress, userId, registrationTime, referrerAddress) => {
        console.log("userAddress", userAddress)
      try {

        // add data base
        // const newUser = new User({
        //   userAddress,
        //   userId: userId.toNumber(),
        //   registrationTime: new Date(registrationTime * 1000),
        //   referrerAddress,
        // });
        // await newUser.save();
        // console.log("User saved to MongoDB:", newUser);
      } catch (error) {
        console.error("Error saving to MongoDB:", error);
      }
    });
  }
  

  module.exports = userListener