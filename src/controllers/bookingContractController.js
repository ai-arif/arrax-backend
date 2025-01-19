const { ethers, JsonRpcProvider } = require("ethers");
const { matrixProABI, bookingContractAddress } = require("../config/contractConfig");
const dotenv = require("dotenv");
dotenv.config();

const getContract = () => {
  try {
    const provider = new JsonRpcProvider(process.env.APP_RPC);
    const contract = new ethers.Contract(bookingContractAddress, matrixProABI, provider);
    return contract;
  } catch (error) {
    console.log("Error initializing contract:", error);
    return {
      success: false,
      message: "Contract initialization failed",
      error: error.message,
    };
  }
};

const getCurrentSlot = async (userAddress) => {
  try {
    const contract = getContract();
    const slotInfo = await contract.getCurrentSlotInfo(userAddress);
    console.log("*****",slotInfo);
    return {
      success: true,
      data: {
        currentActiveSlot: slotInfo[0].toString(),
        currentPosition: slotInfo[1].toString(),
        entryTime: slotInfo[2].toString(),
        matrixSize: slotInfo[3].toString(),
        recycleCount: slotInfo[4].toString(),
        timeInPosition: slotInfo[5].toString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get current slot info: ${error.message}`
    };
  }
};

const getUserActiveSlots = async (userAddress) => {
  try {
    const contract = getContract();
    const activeSlots = await contract.getUserActiveSlots(userAddress);

    return {
      success: true,
      data: {
        slots: activeSlots[0].map(slot => slot.toString()),
        positions: activeSlots[1].map(pos => pos.toString()),
        entryTimes: activeSlots[2].map(time => time.toString())
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get user active slots: ${error.message}`
    };
  }
};

const getUserSlot= async (userAddress) => {
    try {
      const contract = getContract();
      const activeSlots = await contract.userSlots(userAddress);
  
      return {
        success: true,
        activeSlot: Number(activeSlots[0])
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get user active slots: ${error.message}`
      };
    }
  };


  const getSlotData= async (level) => {
    try {
      const contract = getContract();
      const data = await contract.slots(level);
     
  console.log("getSlotData", {
    level: data[0].toString(),
    recycleCount: data[2],
    transactions: data[3].toString()
  })
      return {
        success: true,
        data : {
          level: data[0].toString(),
          recycleCount: data[2],
          transactions: data[3].toString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to getting slots: ${error.message}`
      };
    }
  };



const getUserIncome = async (userAddress) => {
  try {
    const contract = getContract();
    const income = await contract.getUserIncomeStats(userAddress);

    return {
      success: true,
      data: {
        total: ethers.formatEther(income[0]),
        levelIncome: ethers.formatEther(income[1]), 
        directIncome: ethers.formatEther(income[2]),
        slotIncome: ethers.formatEther(income[3]),
        recycleIncome: ethers.formatEther(income[4]),
        salaryIncome: ethers.formatEther(income[5])
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get income stats: ${error.message}`
    };
  }
};

const getUserReferralStats = async (userAddress) => {
  try {
    const contract = getContract();
    const stats = await contract.getUserReferralStats(userAddress);

    return {
      success: true,
      data: {
        totalReferrals: stats[0].toString(),
        activeReferrals: stats[1].toString(),
        totalMatrixEntries: stats[2].toString(),
        activeMatrixPositions: stats[3].toString(),
        totalRecycles: stats[4].toString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get referral stats: ${error.message}`
    };
  }
};

const getMatrixInfo = async (level) => {
  try {
    const contract = getContract();
    const info = await contract.getMatrixInfo(level);

    return {
      success: true,
      data: {
        currentSize: info[0].toString(),
        currentMatrix: info[1],
        totalTransactions: info[2].toString()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get matrix info: ${error.message}`
    };
  }
};

const purchaseSlot = async (userWallet, level) => {
  try {
    const contract = getContract();
    const signer = userWallet.connect(provider);
    const contractWithSigner = contract.connect(signer);

    const tx = await contractWithSigner.purchaseSlot(level);
    const receipt = await tx.wait();

    return {
      success: true,
      data: {
        transactionHash: receipt.hash,
        level
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Slot purchase failed: ${error.message}`
    };
  }
};

const autoUpgrade = async (userWallet) => {
  try {
    const contract = getContract();
    const signer = userWallet.connect(provider);
    const contractWithSigner = contract.connect(signer);

    const tx = await contractWithSigner.autoUpgrade();
    const receipt = await tx.wait();

    return {
      success: true,
      data: {
        transactionHash: receipt.hash
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Auto upgrade failed: ${error.message}`
    };
  }
};

module.exports = {
  getCurrentSlot,
  getUserActiveSlots,
  getUserIncome,
  getUserReferralStats,
  getMatrixInfo,
  getUserSlot,
  getSlotData
//   purchaseSlot,
//   autoUpgrade
};
