const connectDB = require("./config/db");
const {
  getUserByUserId,
  getRegistrationFee,
  getTotalUsers,
  getUserInfo,
  getUserReferrals,
} = require("./controllers/RegisterationContractController");
const {
  getSlotInfo,
  getUserIncome,
  getCurrentSlot,
} = require("./controllers/bookingContractController");
const { loginOrRegisterUser } = require("./services/userService");

const print = async () => {
  await connectDB();
  const { user, token, isNewUser } = await loginOrRegisterUser({
    userId: 2,
    walletAddress: "0xbdC963b0750dBD0F57f6825061646e7F994C08d8",
    fullName: "Md. Mainul Hasan",
    referredBy: 1,
    referrerAddress: "0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd",
  });

  console.log(user);
  console.log(token);
  console.log(isNewUser);
};

print();
