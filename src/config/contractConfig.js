const dotenv = require("dotenv");
dotenv.config();
const  contractAddress = process.env.CONTRACT_ADDRESS;
const registrationContractABI = require("../../ABI/registration.json");

module.exports = {
    contractAddress,
    registrationContractABI
}