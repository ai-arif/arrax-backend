import { ethers } from "ethers";
import { registrationContractABI, contractAddress } from "../config/contractConfig.js";
import { configDotenv } from "dotenv";
configDotenv()

// Base contract connection
export const getContract = () => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.APP_RPC);
  const contract = new ethers.Contract(contractAddress, registrationContractABI, provider);
  return contract;
};

// Get user by referrer ID
export const getUserByReferrerId = async (referrerId) => {
  const contract = getContract();
  const user = await contract.getUserByReferrerId(referrerId);
  return user;
};

// Get user by user ID
export const getUserByUserId = async (userId) => {
  const contract = getContract();
  const user = await contract.getUserByUserId(userId);
  return user;
};

// Get user info by address
export const getUserInfo = async (userAddress) => {
  const contract = getContract();
  const user = await contract.getUserInfo(userAddress);
  return user;
};

// Get user referrals
export const getUserReferrals = async (userAddress) => {
  const contract = getContract();
  const referrals = await contract.getUserReferrals(userAddress);
  return referrals;
};

// Get total users
export const getTotalUsers = async () => {
  const contract = getContract();
  const total = await contract.totalUsers();
  return total;
};

// Get registration fee
export const getRegistrationFee = async () => {
  const contract = getContract();
  const fee = await contract.registrationFee();
  return fee;
};

// Register new user
// export const registerUser = async (signer, referrerId, referrerAddress, username) => {
//   const contract = getContract().connect(signer);
//   const tx = await contract.registerUser(referrerId, referrerAddress, username);
//   return tx.wait();
// };

// Get fee collector address
export const getFeeCollector = async () => {
  const contract = getContract();
  const collector = await contract.feeCollector();
  return collector;
};

// Get payment token address
export const getPaymentToken = async () => {
  const contract = getContract();
  const token = await contract.paymentToken();
  return token;
};

// Check if contract is paused
export const isPaused = async () => {
  const contract = getContract();
  const paused = await contract.paused();
  return paused;
};
