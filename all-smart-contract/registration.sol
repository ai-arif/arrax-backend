// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract UserRegistration is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 userId;
        uint256 referrerId;
        address referrerAddress;
        uint256 registrationTime;
        bool isRegistered;
        address[] referrals;
        string username;
    }

    // Events
    event UserRegistered(
        address indexed userAddress,
        uint256 indexed userId,
        uint256 registrationTime,
        address indexed referrerAddress
    );
    event PaymentTokenUpdated(address indexed newToken);
    event FeeAmountUpdated(uint256 newFeeAmount);
    event FeeCollectorUpdated(address indexed newFeeCollector);

    IERC20 public immutable paymentToken;
    address public feeCollector;
    uint256 public registrationFee = 100_000_000_000_000_000; // 0.1 tokens
    uint256 public totalUsers;

    mapping(address => UserInfo) private users;
    mapping(uint256 => address) private userAddresses;

    error AlreadyRegistered();
    error InvalidReferrer();
    error InvalidAddress();
    error OwnerNotRegistered();
    error CannotReferSelf();
    error InvalidFee();
    error UserNotFound();

    constructor(
        address initialOwner,
        address _tokenAddress,
        address _feeCollector
    ) Ownable(initialOwner) {
        if (_tokenAddress == address(0)) revert InvalidAddress();
        if (_feeCollector == address(0)) revert InvalidAddress();

        paymentToken = IERC20(_tokenAddress);
        feeCollector = _feeCollector;
    }

    function registerOwner() external onlyOwner {
        if (users[msg.sender].isRegistered) revert AlreadyRegistered();

        unchecked {
            ++totalUsers;
        }

        UserInfo storage user = users[msg.sender];
        user.isRegistered = true;
        user.userId = totalUsers;
        user.referrerAddress = address(this);
        user.registrationTime = block.timestamp;
        userAddresses[totalUsers] = msg.sender;
        user.username = "Admin";

        emit UserRegistered(
            msg.sender,
            totalUsers,
            block.timestamp,
            address(this)
        );
    }

    event OwnershipRenounced(address indexed previousOwner);

    function renounceOwnership() public virtual override onlyOwner {
        _transferOwnership(address(0));
        emit OwnershipRenounced(msg.sender);
    }

    function registerUser(
        uint256 referrerId,
        address referrerAddress,
        string calldata _username
    ) external nonReentrant whenNotPaused {
        if (referrerId == 0) revert InvalidReferrer();
        if (totalUsers == 0) revert OwnerNotRegistered();
        if (users[msg.sender].isRegistered) revert AlreadyRegistered();
        if (referrerAddress == address(0)) revert InvalidAddress();
        if (userAddresses[referrerId] != referrerAddress)
            revert InvalidReferrer();
        if (!users[referrerAddress].isRegistered) revert InvalidReferrer();
        if (referrerAddress == msg.sender) revert CannotReferSelf();

        paymentToken.safeTransferFrom(
            msg.sender,
            feeCollector,
            registrationFee
        );

        unchecked {
            ++totalUsers;
        }

        UserInfo storage user = users[msg.sender];
        user.userId = totalUsers;
        user.referrerId = referrerId;
        user.referrerAddress = referrerAddress;
        user.registrationTime = block.timestamp;
        user.isRegistered = true;
        user.username = _username;

        userAddresses[totalUsers] = msg.sender;

        users[referrerAddress].referrals.push(msg.sender);

        emit UserRegistered(
            msg.sender,
            totalUsers,
            block.timestamp,
            referrerAddress
        );
    }

    function getUserReferrals(address userAddress)
        external
        view
        returns (address[] memory)
    {
        return users[userAddress].referrals;
    }

    function getUserInfo(address userAddress)
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
        )
    {
        UserInfo storage user = users[userAddress];
        return (
            user.userId,
            user.referrerId,
            user.referrerAddress,
            user.registrationTime,
            user.isRegistered,
            user.referrals.length,
            user.username
        );
    }

    function getUserByReferrerId(uint256 _referrerId)
        external
        view
        returns (
            address userAddress,
            uint256 userId,
            uint256 registrationTime,
            bool isRegistered,
            uint256 referralCount,
            string memory username
        )
    {
        address refAddress = userAddresses[_referrerId];
        if (refAddress == address(0)) revert UserNotFound();

        UserInfo storage user = users[refAddress];
        return (
            refAddress,
            user.userId,
            user.registrationTime,
            user.isRegistered,
            user.referrals.length,
            user.username
        );
    }

    function getUserByUserId(uint256 _userId)
        external
        view
        returns (
            address userAddress,
            uint256 referrerId,
            address referrerAddress,
            uint256 registrationTime,
            bool isRegistered,
            uint256 referralCount,
            string memory username
        )
    {
        address userAddress = userAddresses[_userId];
        if (userAddress == address(0)) revert UserNotFound();

        UserInfo storage user = users[userAddress];
        return (
            userAddress,
            user.referrerId,
            user.referrerAddress,
            user.registrationTime,
            user.isRegistered,
            user.referrals.length,
            user.username
        );
    }

        function getTotalReferralCount(address user)
        public
        view
        returns (uint256 directReferrals, uint256 totalReferrals)
    {
        directReferrals = users[user].referrals.length;
        totalReferrals = countTotalReferrals(user);
    }

    function countTotalReferrals(address user) internal view returns (uint256) {
        uint256 totalReferrals = users[user].referrals.length;
        
        for (uint256 i = 0; i < users[user].referrals.length; i++) {
            totalReferrals += countTotalReferrals(users[user].referrals[i]);
        }
        
        return totalReferrals;
    }

    function updateFeeCollector(address _newFeeCollector) external onlyOwner {
        if (_newFeeCollector == address(0)) revert InvalidAddress();
        feeCollector = _newFeeCollector;
        emit FeeCollectorUpdated(_newFeeCollector);
    }

    function updateRegistrationFee(uint256 _newFee) external onlyOwner {
        if (_newFee == 0) revert InvalidFee();
        registrationFee = _newFee;
        emit FeeAmountUpdated(_newFee);
    }

    function pauseContract() external onlyOwner {
        _pause();
    }

    function unpauseContract() external onlyOwner {
        _unpause();
    }
}