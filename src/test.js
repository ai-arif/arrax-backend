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
  getUserSlot,
  getSlotData
} = require("./controllers/bookingContractController");
const { loginOrRegisterUser } = require("./services/userService");


const print = async () => {
  console.log(await getUserSlot("0x662058d2d6b489ec3F9fcA34F40d14023F8E9b9b"));
  console.log(await getSlotData(0));
};

print();
