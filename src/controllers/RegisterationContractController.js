const { ethers, JsonRpcProvider } = require("ethers");
const { registrationContractABI, contractAddress } = require("../config/contractConfig");
const dotenv = require("dotenv");
dotenv.config();

const getContract = () => {
  try {
    const provider = new JsonRpcProvider(process.env.APP_RPC);
    const contract = new ethers.Contract(contractAddress, registrationContractABI, provider);
    return contract;
  } catch (error) {
    throw new Error(`Failed to initialize contract: ${error.message}`);
  }
};

const getUserByReferrerId = async (referrerId) => {
  try {
    const contract = getContract();
    const user = await contract.getUserByReferrerId(referrerId);
    return user;
  } catch (error) {
    throw new Error(`Failed to get user by referrer ID: ${error.message}`);
  }
};

const getUserByUserId = async (userId) => {
  try {
    const contract = getContract();
    const user = await contract.getUserByUserId(userId);
    return user;
  } catch (error) {
    throw new Error(`Failed to get user by user ID: ${error.message}`);
  }
};

const getUserInfo = async (userAddress) => {
  try {
    const contract = getContract();
    const user = await contract.getUserInfo(userAddress);
    return user;
  } catch (error) {
    throw new Error(`Failed to get user info: ${error.message}`);
  }
};

const getUserReferrals = async (userAddress) => {
  try {
    const contract = getContract();
    const referrals = await contract.getUserReferrals(userAddress);
    return referrals;
  } catch (error) {
    throw new Error(`Failed to get user referrals: ${error.message}`);
  }
};

const getTotalUsers = async () => {
  try {
    const contract = getContract();
    const total = await contract.totalUsers();
    return total;
  } catch (error) {
    throw new Error(`Failed to get total users: ${error.message}`);
  }
};

const getRegistrationFee = async () => {
  try {
    const contract = getContract();
    const fee = await contract.registrationFee();
    return fee;
  } catch (error) {
    throw new Error(`Failed to get registration fee: ${error.message}`);
  }
};

const getFeeCollector = async () => {
  try {
    const contract = getContract();
    const collector = await contract.feeCollector();
    return collector;
  } catch (error) {
    throw new Error(`Failed to get fee collector: ${error.message}`);
  }
};

const getPaymentToken = async () => {
  try {
    const contract = getContract();
    const token = await contract.paymentToken();
    return token;
  } catch (error) {
    throw new Error(`Failed to get payment token: ${error.message}`);
  }
};

const isPaused = async () => {
  try {
    const contract = getContract();
    const paused = await contract.paused();
    return paused;
  } catch (error) {
    throw new Error(`Failed to check pause status: ${error.message}`);
  }
};

module.exports = {
  getUserByReferrerId,
  getUserByUserId,
  getUserInfo,
  getUserReferrals,
  getTotalUsers,
  getRegistrationFee,
  getFeeCollector,
  getPaymentToken,
  isPaused,
};
