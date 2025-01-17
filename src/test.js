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

const print = async () => {
  // console.log(
  //   await getSlotInfo("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd", 1)
  // );
  console.log(
    await getCurrentSlot("0xbdC963b0750dBD0F57f6825061646e7F994C08d8")
  );

  //   console.log(await getTotalUsers());
  //   console.log(await getUserInfo("0xa26934981D50287F62FDbEf54Ae84c815B3E4dd0"));
  //   console.log(
  //     await getUserReferrals("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd")
  //   );
};

print();
