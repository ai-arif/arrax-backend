const { ethers } = require("ethers");
const { JsonRpcProvider } = require("ethers");
const { bookingContractAddress, matrixProABI } = require("../config/contractConfig.js");
const dotenv = require("dotenv");
dotenv.config();
const provider = new JsonRpcProvider(process.env.APP_RPC);
const contract = new ethers.Contract(bookingContractAddress, matrixProABI, provider);


const getEventLogs = async ( fromBlock = 0) => {
    try {
        console.log("Fetching events from block:", fromBlock);
        // Define all events to track
        const eventFilters = {
            slotPurchased: contract.filters.SlotPurchased(),
            slotRecycled: contract.filters.SlotRecycled(),
            directBonus: contract.filters.DirectBonus(),
            levelBonus: contract.filters.LevelBonus(),
            salaryClaimed: contract.filters.SalaryClaimed(),
            recycleBonus: contract.filters.RecycleBonus()
        };

        // Fetch all events
        const events = await Promise.all([
            contract.queryFilter(eventFilters.slotPurchased, fromBlock),
            contract.queryFilter(eventFilters.slotRecycled, fromBlock),
            contract.queryFilter(eventFilters.directBonus, fromBlock),
            contract.queryFilter(eventFilters.levelBonus, fromBlock),
            contract.queryFilter(eventFilters.salaryClaimed, fromBlock),
            contract.queryFilter(eventFilters.recycleBonus, fromBlock)
        ]);

        // Process and format events
        const formattedEvents = {
            slotPurchases: events[0].map(event => ({
                user: event.args.user,
                level: event.args.level.toString(),
                price: ethers.formatEther(event.args.price),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            })),

            slotRecycles: events[1].map(event => ({
                user: event.args.user,
                level: event.args.level.toString(),
                recycleCount: event.args.recycleCount.toString(),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            })),

            directBonuses: events[2].map(event => ({
                user: event.args.user,
                from: event.args.from,
                amount: ethers.formatEther(event.args.amount),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            })),

            levelBonuses: events[3].map(event => ({
                user: event.args.user,
                from: event.args.from,
                amount: ethers.formatEther(event.args.amount),
                level: event.args.level.toString(),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            })),

            salaryClaims: events[4].map(event => ({
                user: event.args.user,
                level: event.args.level.toString(),
                amount: ethers.formatEther(event.args.amount),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            })),

            recycleBonuses: events[5].map(event => ({
                user: event.args.user,
                level: event.args.level.toString(),
                amount: ethers.formatEther(event.args.amount),
                transactionHash: event.transactionHash,
                blockNumber: event.blockNumber
            }))
        };

        return {
            success: true,
            data: formattedEvents
        };
    } catch (error) {
        console.error("Error fetching events:", error);
        return {
            success: false,
            error: `Failed to fetch events: ${error.message}`
        };
    }
};

const listenToEvents = () => {
    console.log("Listening for Slot events...")
    // const contract = getContract();
    contract.on("SlotPurchased", (user, level, price, event) => {
        console.log("New Slot Purchase:", {
            user,
            level: level.toString(),
            price: ethers.formatEther(price),
            transactionHash: event.transactionHash
        });
    });

    contract.on("SlotRecycled", (user, level, recycleCount, event) => {
        console.log("Slot Recycled:", {
            user,
            level: level.toString(),
            recycleCount: recycleCount.toString(),
            transactionHash: event.transactionHash
        });
    });

    contract.on("DirectBonus", (user, from, amount, event) => {
        console.log("Direct Bonus:", {
            user,
            from,
            amount: ethers.formatEther(amount),
            transactionHash: event.transactionHash
        });
    });

    contract.on("LevelBonus", (user, from, amount, level, event) => {
        console.log("Level Bonus:", {
            user,
            from,
            amount: ethers.formatEther(amount),
            level: level.toString(),
            transactionHash: event.transactionHash
        });
    });

    contract.on("SalaryClaimed", (user, level, amount, event) => {
        console.log("Salary Claimed:", {
            user,
            level: level.toString(),
            amount: ethers.formatEther(amount),
            transactionHash: event.transactionHash
        });
    });

    contract.on("RecycleBonus", (user, level, amount, event) => {
        console.log("Recycle Bonus:", {
            user,
            level: level.toString(),
            amount: ethers.formatEther(amount),
            transactionHash: event.transactionHash
        });
    });
};

const getFilteredEvents = async (contract, userAddress, fromBlock = 0) => {
    try {
        const userFilter = {
            address: contract.address,
            topics: [
                null, // any event signature
                ethers.utils.hexZeroPad(userAddress, 32) // user address as topic
            ]
        };

        const events = await contract.provider.getLogs(userFilter);
        const decodedEvents = events.map(log => {
            try {
                return contract.interface.parseLog(log);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        return {
            success: true,
            data: decodedEvents
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to get filtered events: ${error.message}`
        };
    }
};

module.exports = {
    getEventLogs,
    listenToEvents,
    getFilteredEvents
};
