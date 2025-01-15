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
            message: 'Contract initialization failed',
            error: error.message
        };
    }
};

// const purchaseSlot = async (userWallet, slotLevel, bnbFee, tokenAmount) => {
//     try {
//         const contract = getContract();
//         const signer = userWallet.connect(provider);
//         const contractWithSigner = contract.connect(signer);

//         const tx = await contractWithSigner.purchaseSlot(slotLevel, {
//             value: ethers.parseEther(bnbFee.toString())
//         });
//         const receipt = await tx.wait();

//         return {
//             success: true,
//             data: {
//                 transactionHash: receipt.hash,
//                 slotLevel,
//                 cost: tokenAmount
//             }
//         };
//     } catch (error) {
//         return {
//             success: false,
//             error: `Slot purchase failed: ${error.message}`
//         };
//     }
// };

const getSlotInfo = async (userAddress, slotLevel) => {
    try {
        const contract = getContract();
        const slotInfo = await contract.getSlotInfo(userAddress, slotLevel);
        
        return {
            success: true,
            data: {
                id: slotInfo[0].toString(),
                position: slotInfo[1].toString(),
                recycleCount: slotInfo[2].toString(),
                isActive: slotInfo[3],
                upperSlots: slotInfo[4],
                lowerSlots: slotInfo[5],
                earnings: ethers.formatEther(slotInfo[6])
            }
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get slot info: ${error.message}`
        };
    }
};

const getUserIncome = async (userAddress) => {
    try {
        const contract = getContract();
        const income = await contract.getUserIncome(userAddress);
        
        return {
            success: true,
            data: {
                directIncome: ethers.formatEther(income[0]),
                levelIncome: ethers.formatEther(income[1]),
                recycleIncome: ethers.formatEther(income[2]),
                salaryIncome: ethers.formatEther(income[3])
            }
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get user income: ${error.message}`
        };
    }
};

const getCurrentSlot = async (userAddress) => {
    try {
        const contract = getContract();
        const currentSlot = await contract.currentActiveSlot(userAddress);
        return {
            success: true,
            data: currentSlot.toString()
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get current slot: ${error.message}`
        };
    }
};

const getDirectReferrals = async (userAddress, slotLevel) => {
    try {
        const contract = getContract();
        const referrals = await contract.directReferrals(userAddress, slotLevel);
        return {
            success: true,
            data: referrals
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get direct referrals: ${error.message}`
        };
    }
};

const getSlotPrice = async (level) => {
    try {
        const contract = getContract();
        const price = await contract.slotPrices(level - 1);
        return {
            success: true,
            data: ethers.formatEther(price)
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get slot price: ${error.message}`
        };
    }
};

const getBnbFee = async () => {
    try {
        const contract = getContract();
        const fee = await contract.bnbFee();
        return {
            success: true,
            data: ethers.formatEther(fee)
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get BNB fee: ${error.message}`
        };
    }
};

const formatMatrixPositions = async (positions) => {
    const formattedPositions = [];
    for (let pos of positions) {
        if (pos !== ethers.ZeroAddress) {
            const income = await getUserIncome(pos);
            formattedPositions.push({
                address: pos,
                income: income.success ? income.data : null
            });
        }
    }
    return formattedPositions;
};

const getMatrixStructure = async (userAddress, slotLevel) => {
    try {
        const slotInfo = await getSlotInfo(userAddress, slotLevel);
        if (!slotInfo.success) throw new Error(slotInfo.error);

        const structure = {
            owner: userAddress,
            level: slotLevel,
            upperMatrix: await formatMatrixPositions(slotInfo.data.upperSlots),
            lowerMatrix: await formatMatrixPositions(slotInfo.data.lowerSlots)
        };

        return {
            success: true,
            data: structure
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get matrix structure: ${error.message}`
        };
    }
};

const isSlotActive = async (userAddress, slotLevel) => {
    try {
        const slotInfo = await getSlotInfo(userAddress, slotLevel);
        return {
            success: true,
            data: slotInfo.data.isActive
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to check slot status: ${error.message}`
        };
    }
};

const calculateUpgradeRequirements = async (userAddress) => {
    try {
        const currentSlot = await getCurrentSlot(userAddress);
        if (!currentSlot.success) throw new Error(currentSlot.error);

        const nextLevel = parseInt(currentSlot.data) + 1;
        if (nextLevel > 10) {
            return {
                success: true,
                data: {
                    canUpgrade: false,
                    message: "Maximum level reached"
                }
            };
        }

        const price = await getSlotPrice(nextLevel);
        const bnbFee = await getBnbFee();

        return {
            success: true,
            data: {
                canUpgrade: true,
                nextLevel,
                requiredToken: price.data,
                requiredBnb: bnbFee.data
            }
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to calculate upgrade requirements: ${error.message}`
        };
    }
};


const getUserLevel = async (userAddress) => {
    try {
        const contract = getContract();
        const level = await contract.getUserLevel(userAddress);
        return {
            success: true,
            data: level.toString()
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get user level: ${error.message}`
        };
    }
};

// Get level earnings
const getLevelEarnings = async (level) => {
    try {
        const contract = getContract();
        const earnings = await contract.getLevelEarnings(level);
        return {
            success: true,
            data: ethers.formatEther(earnings)
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get level earnings: ${error.message}`
        };
    }
};

// Get user slot earning
const getUserSlotEarning = async (userAddress, slotLevel) => {
    try {
        const contract = getContract();
        const earning = await contract.getUserSlotEarning(userAddress, slotLevel);
        return {
            success: true,
            data: ethers.formatEther(earning)
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get user slot earning: ${error.message}`
        };
    }
};

// Get complete user stats
const getUserStats = async (userAddress) => {
    try {
        const contract = getContract();
        const stats = await contract.getUserStats(userAddress);
        
        return {
            success: true,
            data: {
                currentLevel: stats[0].toString(),
                slotEarnings: stats[1].map(earning => ethers.formatEther(earning)),
                totalEarnings: ethers.formatEther(stats[2])
            }
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get user stats: ${error.message}`
        };
    }
};

module.exports = {
    purchaseSlot,
    getSlotInfo,
    getUserIncome,
    getCurrentSlot,
    getDirectReferrals,
    getSlotPrice,
    getBnbFee,
    getMatrixStructure,
    isSlotActive,
    calculateUpgradeRequirements,
    getUserLevel,
    getLevelEarnings,
    getUserSlotEarning,
    getUserStats
    
};
