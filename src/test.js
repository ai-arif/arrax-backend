const connectDB = require("./config/db");
const {
  getUserByUserId,
  getRegistrationFee,
  getTotalUsers,
  getUserInfo,
  getUserReferrals,
  isPaused,
} = require("./controllers/RegisterationContractController");
const {
  getSlotInfo,
  getUserIncome,
  getCurrentSlot,
  getUserSlot,
  getSlotData,
} = require("./controllers/bookingContractController");
const { loginOrRegisterUser } = require("./services/userService");

const print = async () => {
  console.log(await isPaused());
  // console.log(await getSlotData(0));
};

print();
