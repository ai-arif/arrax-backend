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
    return {
      success: false,
      message: 'Contract initialization failed',
      error: error.message
    };
  }
};

const getUserByReferrerId = async (referrerId) => {
  try {
    const contract = getContract();
    const user = await contract.getUserByReferrerId(referrerId);
    
    if (!user || user === '0x') {
      return {
        success: false,
        message: 'Referrer not found',
        data: null
      };
    }

    return {
      success: true,
      data: user
    };
  } catch (error) {
    return {
      success: false,
      message: 'Referrer lookup failed',
      error: error.message
    };
  }
};

const getUserByUserId = async (userId) => {
  try {
    const contract = getContract();
    const user = await contract.getUserByUserId(userId);
    
    if (!user || user === '0x') {
      return {
        success: false,
        message: 'User ID not found',
        data: null
      };
    }

    return {
      success: true,
      data: user
    };
  } catch (error) {
    return {
      success: false,
      message: 'User ID lookup failed',
      error: error.message
    };
  }
};

const getUserInfo = async (userAddress) => {
  try {
    const contract = getContract();
    const user = await contract.getUserInfo(userAddress);
    
    if (!user || user === '0x') {
      return {
        success: false,
        message: 'User not found',
        data: null
      };
    }

    return {
      success: true,
      data: user
    };
  } catch (error) {
    return {
      success: false,
      message: 'User lookup failed',
      error: error.message
    };
  }
};

const getUserReferrals = async (userAddress) => {
  try {
    const contract = getContract();
    const referrals = await contract.getUserReferrals(userAddress);
    
    if (!referrals) {
      return {
        success: false,
        message: 'No referrals found',
        data: []
      };
    }

    return {
      success: true,
      data: referrals
    };
  } catch (error) {
    return {
      success: false,
      message: 'Referrals lookup failed',
      error: error.message
    };
  }
};

const getTotalUsers = async () => {
  try {
    const contract = getContract();
    const total = await contract.totalUsers();
    
    return {
      success: true,
      data: total
    };
  } catch (error) {
    return {
      success: false,
      message: 'Total users lookup failed',
      error: error.message
    };
  }
};

const getRegistrationFee = async () => {
  try {
    const contract = getContract();
    const fee = await contract.registrationFee();
    
    return {
      success: true,
      data: fee
    };
  } catch (error) {
    return {
      success: false,
      message: 'Registration fee lookup failed',
      error: error.message
    };
  }
};

const getFeeCollector = async () => {
  try {
    const contract = getContract();
    const collector = await contract.feeCollector();
    
    if (!collector) {
      return {
        success: false,
        message: 'Fee collector not found',
        data: null
      };
    }

    return {
      success: true,
      data: collector
    };
  } catch (error) {
    return {
      success: false,
      message: 'Fee collector lookup failed',
      error: error.message
    };
  }
};

const getPaymentToken = async () => {
  try {
    const contract = getContract();
    const token = await contract.paymentToken();
    
    if (!token) {
      return {
        success: false,
        message: 'Payment token not found',
        data: null
      };
    }

    return {
      success: true,
      data: token
    };
  } catch (error) {
    return {
      success: false,
      message: 'Payment token lookup failed',
      error: error.message
    };
  }
};

const isPaused = async () => {
  try {
    const contract = getContract();
    const paused = await contract.paused();
    
    return {
      success: true,
      data: paused
    };
  } catch (error) {
    return {
      success: false,
      message: 'Contract pause status check failed',
      error: error.message
    };
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
