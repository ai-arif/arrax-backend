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
} = require("./controllers/bookingContractController");

const print = async () => {
  console.log(
    await getSlotInfo("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd", 1)
  );

  //   console.log(await getTotalUsers());
  //   console.log(await getUserInfo("0xa26934981D50287F62FDbEf54Ae84c815B3E4dd0"));
  //   console.log(
  //     await getUserReferrals("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd")
  //   );
};

print();
