import {ethers } from "ethers"
import { contractABI, contractAddress } from "../config/contractConfig";



export const getContract = () => {
  const provider = new ethers.providers.JsonRpcProvider(process.env.APP_RPC);
  const contract = new ethers.Contract(contractAddress, contractABI, provider);
  return contract;
};



export const getUserByUserId = async (userId) => {
  const contract = getContract();
  const user = await contract.getUserByUserId(userId);
  return user;
};


export const getUserByAddress = async (address) => {
  const contract = getContract();
  const user = await contract.getUserByAddress(address);
  return user;
};