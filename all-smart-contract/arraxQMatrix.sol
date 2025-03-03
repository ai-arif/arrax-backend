// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IRegistration {
    struct UserInfo {
        uint256 userId;
        uint256 referrerId;
        address referrerAddress;
        bool isRegistered;
        address[] referrals;
    }

    function getUserInfo(address user)
        external
        view
        returns (
            uint256 userId,
            uint256 referrerId,
            address referrerAddress,
            uint256 registrationTime,
            bool isRegistered,
            uint256 referralCount,
            string memory username
        );
}

contract ArraxQMatrix is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Structs
    struct Income {
        uint256 total;
        uint256 levelIncome;
        uint256 directIncome;
        uint256 slotIncome;
        uint256 recycleIncome;
        uint256 salaryIncome;
    }

    struct UserStats {
        uint256 totalReferrals;
        uint256 activeReferrals;
        uint256 totalMatrixEntries;
        uint256 activeMatrixPositions;
        uint256 totalRecycles;
        mapping(uint256 => uint256) levelReferrals;
        mapping(uint256 => uint256) matrixPositions;
    }

    struct Slot {
        uint256 level;
        uint256 price;
        uint256 recycleCount;
        uint256 transactions;
        address[] matrix;
        mapping(address => bool) isInMatrix;
    }

    struct UserSlot {
        uint256 currentLevel;
        uint256 totalEarnings;
        uint256[] activeSlots;
        mapping(uint256 => uint256) slotTransactions;
        mapping(uint256 => uint256) recycleCount;
        uint256 lastActivityTime;
        uint256 currentActiveSlot;
        uint256 currentSlotPosition;
        uint256 currentSlotEntryTime;
    }

    // Events

    event MatrixReset(uint256 indexed level, uint256 membersCount);

    event SlotPurchased(
        address indexed user,
        uint256 indexed level,
        uint256 price
    );
    event MatrixComplete(address indexed user, uint256 indexed level);
    event Recycled(
        address indexed user,
        uint256 indexed level,
        uint256 recycleCount
    );
    event RewardDistributed(
        address indexed user,
        address indexed from,
        uint256 amount,
        uint256 level,
        string incomeType
    );
    event SlotsInitialized(address indexed user);
    event EmergencyWithdrawn(address token, uint256 amount);
    event SlotPositionUpdated(
        address indexed user,
        uint256 indexed level,
        uint256 position,
        uint256 entryTime
    );

    // State variables
    IRegistration public registration;
    IERC20 public paymentToken;
    mapping(uint256 => address) public lastSlotPurchaser;

    uint256[] public slotPrices = [
        4e18,
        8e18,
        15e18,
        30e18,
        60e18,
        120e18,
        240e18,
        480e18,
        960e18,
        1920e18
    ];
    uint256 constant MATRIX_SIZE = 4;
    uint256 constant RECYCLE_THRESHOLD = 4;
    uint256 public BSC_FEE;

    // Mappings
    mapping(uint256 => Slot) public slots;
    mapping(address => UserSlot) public userSlots;
    mapping(address => Income) public userIncome;
    mapping(address => UserStats) public userStats;
    mapping(address => mapping(uint256 => bool)) public hasUpgraded;
    mapping(address => mapping(address => uint256)) public referralPositions;
    mapping(address => mapping(uint256 => uint256)) public levelReferralCounts;

    uint256 public constant SPECIAL_POSITION_1 = 3;
    uint256 public constant SPECIAL_POSITION_2 = 4;

    address public motherWallet;
    address public bscFeeWallet;
    uint256 public inactivityPeriod = 30 days;

    constructor(
        address _registration,
        address _paymentToken,
        address _motherWallet,
        address _bscFeeWallet
    ) Ownable(msg.sender) {
        require(_registration != address(0), "Inv Regis. address");
        require(_paymentToken != address(0), "Inv token address");
        require(_motherWallet != address(0), "Inv mother wallet");
        require(_bscFeeWallet != address(0), "Inv BSC fee wallet");

        registration = IRegistration(_registration);
        paymentToken = IERC20(_paymentToken);
        motherWallet = _motherWallet;
        bscFeeWallet = _bscFeeWallet;
        BSC_FEE = 3e16;

        for (uint256 i = 0; i < slotPrices.length; i++) {
            slots[i].level = i + 1;
            slots[i].price = slotPrices[i];
        }
    }

    mapping(address => bool) private processingAutoUpgrade;

    function purchaseSlot(uint256 _level)
        public
        payable
        nonReentrant
        whenNotPaused
    {
        require(_level > 0 && _level <= slotPrices.length, "Inv Level");
        require(!hasUpgraded[msg.sender][_level], "AlreadyUpgraded");
        require(msg.value == BSC_FEE, "Send 0.03 BNB");

        (, , , , bool isRegistered, , ) = registration.getUserInfo(msg.sender);
        require(isRegistered, "Not registered");

        if (_level > 1) {
            require(
                hasUpgraded[msg.sender][_level - 1],
                "Must purchase previous level"
            );
        }

        uint256 price = slotPrices[_level - 1];

        (bool sent, ) = bscFeeWallet.call{value: BSC_FEE}("");
        require(sent, "Failed to send BSC fee");

        paymentToken.safeTransferFrom(msg.sender, address(this), price);

        _processSlotPurchase(msg.sender, _level, price);
    }

    // Add new function for auto-upgrade
    function autoUpgrade() external payable whenNotPaused {
        uint256 currentLevel = userSlots[msg.sender].currentLevel;
        require(
            currentLevel > 0 && currentLevel < slotPrices.length,
            "No upgrade available"
        );
        require(
            !hasUpgraded[msg.sender][currentLevel + 1],
            "AlreadyUpgraded to next level"
        );

        purchaseSlot(currentLevel + 1);
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "New owner cannot be the zero address");
        require(
            newOwner != owner(),
            "New owner must be different from current owner"
        );
        _transferOwnership(newOwner);
    }

    function _upgradeProcessSlotPurchase(address user, uint256 level) internal {
        Slot storage slot = slots[level - 1];
        UserSlot storage userSlot = userSlots[user];
        UserStats storage stats = userStats[user];

        (, , address referrer, , , , ) = registration.getUserInfo(user);
        uint256 referralPosition = 0;

        if (referrer != address(0)) {
            UserStats storage referrerStats = userStats[referrer];
            referrerStats.totalReferrals++;
            referrerStats.activeReferrals++;
            referrerStats.levelReferrals[level]++;

            // Add these lines to match _processSlotPurchase behavior
            levelReferralCounts[referrer][level]++;
            referralPosition = levelReferralCounts[referrer][level];
            referralPositions[referrer][user] = referralPosition;

            // This should now check levelReferralCounts instead
            if (levelReferralCounts[referrer][level] % RECYCLE_THRESHOLD == 0) {
                _recyclePosition(referrer, level);
            }
        }

        // Update user stats
        stats.totalMatrixEntries++;
        stats.activeMatrixPositions++;
        stats.matrixPositions[level]++;

        hasUpgraded[user][level] = true;
        userSlot.activeSlots.push(level);
        userSlot.currentLevel = level;
        userSlot.lastActivityTime = block.timestamp;

        // Update current active slot information
        userSlot.currentActiveSlot = level;
        userSlot.currentSlotPosition = slot.matrix.length; // Position in current matrix
        userSlot.currentSlotEntryTime = block.timestamp;

        slot.matrix.push(user);
        slot.isInMatrix[user] = true;
        slot.transactions++;

        emit SlotPositionUpdated(
            user,
            level,
            userSlot.currentSlotPosition,
            userSlot.currentSlotEntryTime
        );
    }

    function _processSlotPurchase(
        address user,
        uint256 level,
        uint256 price
    ) internal {
        Slot storage slot = slots[level - 1];
        UserSlot storage userSlot = userSlots[user];
        UserStats storage stats = userStats[user];

        (, , address referrer, , , , ) = registration.getUserInfo(user);
        uint256 referralPosition = 0;

        if (referrer != address(0)) {
            UserStats storage referrerStats = userStats[referrer];
            referrerStats.totalReferrals++;
            referrerStats.activeReferrals++;
            referrerStats.levelReferrals[level]++;

            // Track level-specific referral count
            levelReferralCounts[referrer][level]++;
            referralPosition = levelReferralCounts[referrer][level];

            // Store position for this specific level
            referralPositions[referrer][user] = referralPosition;
        }

        // Update user stats
        stats.totalMatrixEntries++;
        stats.activeMatrixPositions++;
        stats.matrixPositions[level]++;

        hasUpgraded[user][level] = true;
        userSlot.activeSlots.push(level);
        userSlot.currentLevel = level;
        userSlot.lastActivityTime = block.timestamp;

        userSlot.currentActiveSlot = level;
        userSlot.currentSlotPosition = slot.matrix.length;
        userSlot.currentSlotEntryTime = block.timestamp;

        slot.matrix.push(user);
        slot.isInMatrix[user] = true;
        slot.transactions++;

        // Distribute rewards based on level-specific position
        _distributeRewards(user, level, price, referralPosition);

        if (slot.matrix.length == MATRIX_SIZE) {
            _processMatrixCompletion(level);
        }

        emit SlotPurchased(user, level, price);
        emit SlotPositionUpdated(
            user,
            level,
            userSlot.currentSlotPosition,
            userSlot.currentSlotEntryTime
        );
    }

    function adminRecyclePosition(address user, uint256 level)
        public
        onlyOwner
        nonReentrant
    {
        require(level > 0 && level <= slotPrices.length, "Invalid level");
        require(hasUpgraded[user][level], "User hasn't upgraded to this level");

        // Check if user has the threshold number of referrals for recycling
        uint256 referralCount = levelReferralCounts[user][level];
        require(
            referralCount >= RECYCLE_THRESHOLD,
            "Not enough referrals to recycle"
        );

        // if (level % MATRIX_SIZE == 0) {
        _recyclePosition(user, level);
        // }
    }

    function getAdminStats()
        external
        view
        returns (
            uint256[] memory slotSizes,
            uint256[] memory slotTransactions,
            uint256[] memory slotRecycles,
            uint256 totalTransactions
        )
    {
        slotSizes = new uint256[](slotPrices.length);
        slotTransactions = new uint256[](slotPrices.length);
        slotRecycles = new uint256[](slotPrices.length);
        totalTransactions = 0;

        for (uint256 i = 0; i < slotPrices.length; i++) {
            Slot storage slot = slots[i];
            slotSizes[i] = slot.matrix.length;
            slotTransactions[i] = slot.transactions;
            slotRecycles[i] = slot.recycleCount;
            totalTransactions += slot.transactions;
        }

        return (slotSizes, slotTransactions, slotRecycles, totalTransactions);
    }

    function _processMatrixCompletion(uint256 level) internal {
        Slot storage slot = slots[level - 1];

        require(slot.matrix.length == MATRIX_SIZE, "Not full");

        for (uint256 i = 0; i < slot.matrix.length; i++) {
            address matrixUser = slot.matrix[i];
            UserSlot storage userSlot = userSlots[matrixUser];
            // Reset current slot info if user was in this matrix
            if (userSlot.currentActiveSlot == level) {
                userSlot.currentActiveSlot = 0;
                userSlot.currentSlotPosition = 0;
                userSlot.currentSlotEntryTime = 0;
                emit SlotPositionUpdated(matrixUser, level, 0, 0);
            }
            slot.isInMatrix[matrixUser] = false;
        }

        delete slot.matrix;

        emit MatrixComplete(msg.sender, level);
    }

    function _recyclePosition(address user, uint256 level) internal {
        UserSlot storage userSlot = userSlots[user];
        UserStats storage stats = userStats[user];
        Slot storage slot = slots[level - 1];

        // Verify the user has upgraded to this level
        require(hasUpgraded[user][level], "User not upgraded to this level");

        // Increment recycling counters
        userSlot.recycleCount[level]++;
        stats.totalRecycles++;
        slot.recycleCount++;

        // Remove user from current slot matrix if they're in it
        if (slot.isInMatrix[user]) {
            // Find and remove the user from the matrix array
            for (uint256 i = 0; i < slot.matrix.length; i++) {
                if (slot.matrix[i] == user) {
                    // If not the last element, move last element to this position
                    if (i != slot.matrix.length - 1) {
                        slot.matrix[i] = slot.matrix[slot.matrix.length - 1];

                        // Update the position of the moved user
                        address movedUser = slot.matrix[i];
                        if (
                            movedUser != address(0) &&
                            userSlots[movedUser].currentActiveSlot == level
                        ) {
                            userSlots[movedUser].currentSlotPosition = i;
                            emit SlotPositionUpdated(
                                movedUser,
                                level,
                                i,
                                userSlots[movedUser].currentSlotEntryTime
                            );
                        }
                    }
                    slot.matrix.pop();
                    break;
                }
            }
            slot.isInMatrix[user] = false;
        }

        // Reset user's current slot information
        if (userSlot.currentActiveSlot == level) {
            userSlot.currentActiveSlot = 0;
            userSlot.currentSlotPosition = 0;
            userSlot.currentSlotEntryTime = 0;
            emit SlotPositionUpdated(user, level, 0, 0);
        }

        // Reset referral counters for this level only
        // Note: We don't reset stats.levelReferrals as it's a cumulative count
        // levelReferralCounts is the one that matters for recycling logic
        levelReferralCounts[user][level] = 0;

        emit Recycled(user, level, userSlot.recycleCount[level]);
    }

    function getReferralCountForLevel(address user, uint256 level)
        external
        view
        returns (uint256)
    {
        return levelReferralCounts[user][level];
    }

    function getUserActiveSlots(address user)
        external
        view
        returns (
            uint256[] memory slots,
            uint256[] memory positions,
            uint256[] memory entryTimes
        )
    {
        UserSlot storage userSlot = userSlots[user];
        uint256 activeSlotCount = userSlot.activeSlots.length;

        slots = new uint256[](activeSlotCount);
        positions = new uint256[](activeSlotCount);
        entryTimes = new uint256[](activeSlotCount);

        for (uint256 i = 0; i < activeSlotCount; i++) {
            uint256 slotLevel = userSlot.activeSlots[i];
            slots[i] = slotLevel;

            if (slotLevel == userSlot.currentActiveSlot) {
                positions[i] = userSlot.currentSlotPosition;
                entryTimes[i] = userSlot.currentSlotEntryTime;
            }
        }

        return (slots, positions, entryTimes);
    }

    // Modified _distributeRewards function with proper slot upgrade check
    function _distributeRewards(
        address user,
        uint256 level,
        uint256 amount,
        uint256 referralPosition
    ) internal {
        (, , address referrer, , , , ) = registration.getUserInfo(user);
        uint256 directReward = (amount * 50) / 100;

        if (referrer != address(0)) {
            // Check if referrer has upgraded to this level
            if (!hasUpgraded[referrer][level]) {
                // Instead of immediately sending to mother wallet, check upline referrers
                address currentUpline = referrer;
                bool foundQualifiedUpline = false;

                // Loop through upline to find qualified referrer (who has upgraded to this level)
                for (
                    uint256 i = 0;
                    i < 10 && currentUpline != address(0);
                    i++
                ) {
                    // Get the upline of the current referrer
                    (, , address upline, , , , ) = registration.getUserInfo(
                        currentUpline
                    );

                    // Move to next upline
                    currentUpline = upline;

                    // If we found an upline that has upgraded to this level, send rewards to them
                    if (
                        currentUpline != address(0) &&
                        hasUpgraded[currentUpline][level]
                    ) {
                        _sendReward(
                            currentUpline,
                            directReward,
                            "inherited_direct"
                        );
                        userIncome[currentUpline].directIncome += directReward;
                        emit RewardDistributed(
                            currentUpline,
                            user,
                            directReward,
                            level,
                            "inherited_direct_reward"
                        );
                        foundQualifiedUpline = true;
                        break;
                    }
                }

                // If no qualified upline found, send to mother wallet
                if (!foundQualifiedUpline) {
                    _sendReward(motherWallet, directReward, "pending_upgrade");
                    emit RewardDistributed(
                        motherWallet,
                        user,
                        directReward,
                        level,
                        "pending_upgrade_reward"
                    );
                }
            } else {
                // Referrer has upgraded to this level - handle special cases

                // Special handling for 3rd, 6th, 9th... referral at this level (divisible by 3)
                if (referralPosition % 3 == 0) {
                    (, , address referrersReferrer, , , , ) = registration
                        .getUserInfo(referrer);

                    if (
                        referrersReferrer != address(0) &&
                        hasUpgraded[referrersReferrer][level]
                    ) {
                        _sendReward(
                            referrersReferrer,
                            directReward,
                            "direct_11th"
                        );
                        userIncome[referrersReferrer]
                            .directIncome += directReward;
                        emit RewardDistributed(
                            referrersReferrer,
                            user,
                            directReward,
                            level,
                            "direct_11th_referral"
                        );
                    } else {
                        // Find qualified upline if referrer's referrer doesn't qualify
                        address currentUpline = referrersReferrer;
                        bool foundQualifiedUpline = false;

                        // Loop through upline to find qualified referrer
                        for (
                            uint256 i = 0;
                            i < 10 && currentUpline != address(0);
                            i++
                        ) {
                            // Get upline of the current referrer
                            (, , address upline, , , , ) = registration
                                .getUserInfo(currentUpline);

                            // Move to next upline
                            currentUpline = upline;

                            // If we found a qualified upline, send rewards to them
                            if (
                                currentUpline != address(0) &&
                                hasUpgraded[currentUpline][level]
                            ) {
                                _sendReward(
                                    currentUpline,
                                    directReward,
                                    "inherited_third_direct"
                                );
                                userIncome[currentUpline]
                                    .directIncome += directReward;
                                emit RewardDistributed(
                                    currentUpline,
                                    user,
                                    directReward,
                                    level,
                                    "inherited_third_direct_reward"
                                );
                                foundQualifiedUpline = true;
                                break;
                            }
                        }

                        // If no qualified upline found, send to mother wallet
                        if (!foundQualifiedUpline) {
                            _sendReward(
                                motherWallet,
                                directReward,
                                "unclaimed_11th"
                            );
                            emit RewardDistributed(
                                motherWallet,
                                user,
                                directReward,
                                level,
                                "unclaimed_11th_referral"
                            );
                        }
                    }
                }
                // Enhanced recycle logic for 4th, 8th, 12th... referral (divisible by 4)
                else if (referralPosition % 4 == 0) {
                    // Find qualified upline for this special case
                    address currentUpline = referrer;
                    bool foundQualifiedUpline = false;

                    // Loop through upline to find a qualified referrer for special recycling reward
                    for (
                        uint256 i = 0;
                        i < 5 && currentUpline != address(0);
                        i++
                    ) {
                        if (i == 0) {
                            // First check the direct referrer (which we know is qualified)
                            if (hasUpgraded[currentUpline][level]) {
                                _recyclePosition(currentUpline, level);
                                _sendReward(
                                    motherWallet,
                                    directReward,
                                    "direct_12th"
                                );
                                emit RewardDistributed(
                                    motherWallet,
                                    user,
                                    directReward,
                                    level,
                                    "direct_12th_referral"
                                );
                                foundQualifiedUpline = true;
                                break;
                            }
                        } else {
                            // Then check upline
                            (, , address upline, , , , ) = registration
                                .getUserInfo(currentUpline);
                            currentUpline = upline;

                            if (
                                currentUpline != address(0) &&
                                hasUpgraded[currentUpline][level]
                            ) {
                                _recyclePosition(currentUpline, level);
                                _sendReward(
                                    motherWallet,
                                    directReward,
                                    "inherited_direct_12th"
                                );
                                emit RewardDistributed(
                                    motherWallet,
                                    user,
                                    directReward,
                                    level,
                                    "inherited_direct_12th_referral"
                                );
                                foundQualifiedUpline = true;
                                break;
                            }
                        }
                    }

                    // If no qualified upline found, just send to mother wallet without recycling
                    if (!foundQualifiedUpline) {
                        _sendReward(
                            motherWallet,
                            directReward,
                            "unclaimed_12th"
                        );
                        emit RewardDistributed(
                            motherWallet,
                            user,
                            directReward,
                            level,
                            "unclaimed_12th_referral"
                        );
                    }
                } else {
                    // Normal referral case - direct to referrer
                    _sendReward(referrer, directReward, "direct");
                    userIncome[referrer].directIncome += directReward;
                    emit RewardDistributed(
                        referrer,
                        user,
                        directReward,
                        level,
                        "direct"
                    );
                }
            }
        } else {
            // No referrer case - send to mother wallet
            _sendReward(motherWallet, directReward, "unclaimed_direct");
            emit RewardDistributed(
                motherWallet,
                user,
                directReward,
                0,
                "unclaimed_direct"
            );
        }

        // Generation pool distribution (45% of amount)
        uint256 generationPool = (amount * 45) / 100;
        address current = referrer;
        uint256 unclaimedReward = 0;

        for (uint256 i = 1; i <= 10 && current != address(0); i++) {
            (, , address upline, , , , ) = registration.getUserInfo(current);
            uint256 levelReward;

            if (i == 1)
                levelReward = (generationPool * 55) / 1000 + unclaimedReward;
            else if (i == 2)
                levelReward = (generationPool * 300) / 1000 + unclaimedReward;
            else if (i == 3)
                levelReward = (generationPool * 170) / 1000 + unclaimedReward;
            else if (i == 4 || i == 5)
                levelReward = (generationPool * 100) / 1000 + unclaimedReward;
            else levelReward = (generationPool * 55) / 1000 + unclaimedReward;

            unclaimedReward = 0;

            // Check if current user has upgraded to this level
            if (current == address(0) || !hasUpgraded[current][level]) {
                // If not, add reward to unclaimed for next qualified upline
                unclaimedReward = levelReward;
                continue; // Skip to next upline
            }

            // Send reward to qualified user
            _sendReward(current, levelReward, "level");
            userIncome[current].levelIncome += levelReward;
            emit RewardDistributed(current, user, levelReward, i, "level");

            // Move to next upline
            current = upline;
        }

        // Send any remaining unclaimed rewards to mother wallet
        if (unclaimedReward > 0) {
            _sendReward(motherWallet, unclaimedReward, "unclaimed_level");
            emit RewardDistributed(
                motherWallet,
                user,
                unclaimedReward,
                0,
                "unclaimed_level"
            );
        }

        // Last slot purchaser reward (5% of amount)
        uint256 motherReward = (amount * 5) / 100;
        address previousSlotUser = lastSlotPurchaser[level];

        if (previousSlotUser != address(0)) {
            _sendReward(
                previousSlotUser,
                motherReward,
                "last_slot_distribution"
            );
            emit RewardDistributed(
                previousSlotUser,
                user,
                motherReward,
                level,
                "last_slot_distribution"
            );
        } else {
            _sendReward(motherWallet, motherReward, "admin");
            emit RewardDistributed(
                motherWallet,
                user,
                motherReward,
                level,
                "admin_reward"
            );
        }

        // Update last slot purchaser
        lastSlotPurchaser[level] = user;
    }

    // New helper function to verify recycle conditions
    function _shouldRecycle(address user, uint256 level)
        internal
        view
        returns (bool)
    {
        UserSlot storage userSlot = userSlots[user];
        uint256 referralCount = levelReferralCounts[user][level];

        // Check if user has reached exactly 12 referrals at this level
        bool hasRequiredReferrals = referralCount == RECYCLE_THRESHOLD;

        // Check if user is actually in the matrix at this level
        bool isInCurrentMatrix = slots[level - 1].isInMatrix[user];

        // Check if user has upgraded to this level
        bool hasUpgradedToLevel = hasUpgraded[user][level];

        // Ensure user hasn't already recycled recently
        bool canRecycle = userSlot.recycleCount[level] < 100; // Safety limit

        return
            hasRequiredReferrals &&
            isInCurrentMatrix &&
            hasUpgradedToLevel &&
            canRecycle;
    }

    function getLastSlotPurchaser(uint256 level)
        external
        view
        returns (address)
    {
        return lastSlotPurchaser[level];
    }

    function _sendReward(
        address recipient,
        uint256 amount,
        string memory rewardType
    ) internal {
        UserSlot storage userSlot = userSlots[recipient];
        Income storage income = userIncome[recipient];

        userSlot.totalEarnings += amount;
        income.total += amount;

        paymentToken.safeTransfer(recipient, amount);
    }

    // View functions for user information
    function getUserIncomeStats(address user)
        external
        view
        returns (
            uint256 total,
            uint256 levelIncome,
            uint256 directIncome,
            uint256 slotIncome,
            uint256 recycleIncome,
            uint256 salaryIncome
        )
    {
        Income storage income = userIncome[user];
        return (
            income.total,
            income.levelIncome,
            income.directIncome,
            income.slotIncome,
            income.recycleIncome,
            income.salaryIncome
        );
    }

    function getUserReferralStats(address user)
        external
        view
        returns (
            uint256 totalReferrals,
            uint256 activeReferrals,
            uint256 totalMatrixEntries,
            uint256 activeMatrixPositions,
            uint256 totalRecycles
        )
    {
        UserStats storage stats = userStats[user];
        return (
            stats.totalReferrals,
            stats.activeReferrals,
            stats.totalMatrixEntries,
            stats.activeMatrixPositions,
            stats.totalRecycles
        );
    }

    function getMatrixInfo(uint256 level)
        external
        view
        returns (
            uint256 currentSize,
            address[] memory currentMatrix,
            uint256 totalTransactions
        )
    {
        Slot storage slot = slots[level - 1];
        return (slot.matrix.length, slot.matrix, slot.transactions);
    }

    // Admin functions
    function initializeUserSlots(address user) external onlyOwner {
        require(user != address(0), "Inv Address");
        (, , , , bool isRegistered, , ) = registration.getUserInfo(user);
        require(isRegistered, "Not Registered");

        for (uint256 i = 1; i <= slotPrices.length; i++) {
            if (!hasUpgraded[user][i]) {
                hasUpgraded[user][i] = true;
                userSlots[user].activeSlots.push(i);
                userSlots[user].currentLevel = i;

                Slot storage slot = slots[i - 1];
                slot.matrix.push(user);
                slot.isInMatrix[user] = true;

                if (slot.matrix.length == MATRIX_SIZE) {
                    _processMatrixCompletion(i);
                }
            }
        }

        userSlots[user].lastActivityTime = block.timestamp;
        emit SlotsInitialized(user);
    }

    function upgradeUserSlot(address user, uint256 level)
        external
        onlyOwner
        nonReentrant
        whenNotPaused
    {
        require(user != address(0), "Inv Address");
        require(level > 0 && level <= slotPrices.length, "Inv Level");
        require(!hasUpgraded[user][level], "AlreadyUpgraded ");
        (, , , , bool isRegistered, , ) = registration.getUserInfo(user);
        require(isRegistered, "User not registered");

        _upgradeProcessSlotPurchase(user, level);
    }

    function updateBscFeeWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Inv Address");
        bscFeeWallet = _newWallet;
    }

    function updateMotherWallet(address _newWallet) external onlyOwner {
        require(_newWallet != address(0), "Inv Address");
        motherWallet = _newWallet;
    }

    function updateInactivityPeriod(uint256 _newPeriod) external onlyOwner {
        inactivityPeriod = _newPeriod;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function updateBscFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1e18, "Fee < 1 BNB"); // Safety check
        BSC_FEE = _newFee;
    }

    function getUserLevelRecycleCount(address user, uint256 level)
        external
        view
        returns (uint256)
    {
        require(level > 0 && level <= slotPrices.length, "Inv Level");
        return userSlots[user].recycleCount[level];
    }

    function getUserLevelStatus(address user, uint256 level)
        external
        view
        returns (
            bool isUpgraded,
            bool isInMatrix,
            uint256 position,
            uint256 recycleCount
        )
    {
        return (
            hasUpgraded[user][level],
            slots[level - 1].isInMatrix[user],
            userSlots[user].currentSlotPosition,
            userSlots[user].recycleCount[level]
        );
    }

    function getLevelReferralDetails(address user, uint256 level)
        external
        view
        returns (
            uint256 referralCount,
            uint256 recycleCount,
            uint256 slotTransactions,
            bool isUpgraded,
            bool isActive
        )
    {
        require(level > 0 && level <= slotPrices.length, "Inv level");

        UserStats storage stats = userStats[user];
        UserSlot storage userSlot = userSlots[user];
        Slot storage slot = slots[level - 1];

        referralCount = stats.levelReferrals[level];
        recycleCount = userSlot.recycleCount[level];
        slotTransactions = userSlot.slotTransactions[level];
        isUpgraded = hasUpgraded[user][level];
        isActive = slot.isInMatrix[user];

        return (
            referralCount,
            recycleCount,
            slotTransactions,
            isUpgraded,
            isActive
        );
    }

    function getReferralPosition(address referrer, address referral)
        external
        view
        returns (uint256)
    {
        return referralPositions[referrer][referral];
    }
}
