require("dotenv").config();
const express = require("express");
const logger = require("./utils/logger.cjs");
const morgan = require("morgan");
const app = express();
const port = process.env.PORT || 5000;
const path = require("path");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const adminRoutes = require("./routes/adminRoutes");
const testRoutes = require("./routes/testBlockchainFormatRoutes");
const homeRoutes = require("./routes/homeRoutes");
const cors = require("cors");
const userListener = require("./cmd/userListener");
const { get } = require("http");
const {
  getUserInfo,
} = require("./controllers/RegisterationContractController");
const { listenToEvents, getEventLogs } = require("./cmd/matrixListener");
const { BN } = require("bn.js");
const {
  getUserSlot,

  upgradeUserSlot,
  getUserActiveSlots,
  getUserStats,
  getLevelReferralDetails,
  getMatrixInfo,
  getUserReferralStats,
  getCurrentSlot,
} = require("./controllers/bookingContractController");
const User = require("./models/User");
const Order = require("./models/Order");
const Transaction = require("./models/Transaction");
const { handleMissingUsers } = require("./cmd/runner");
const job = require("./cmd/runner");
const scheduleUserSync = require("./cmd/runner");
// const { getSlotInfo } = require("./controllers/bookingContractController");
const morganFormat =
  ":method :url :status :res[content-length] - :response-time ms";
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const logObject = {
          method: message.split(" ")[0],
          url: message.split(" ")[1],
          status: message.split(" ")[2],
          responseTime: message.split(" ")[5],
        };
        logger.info(JSON.stringify(logObject));
      },
    },
  })
);

userListener();
// Middleware
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors());
app.use(express.json());

connectDB();
app.get("/", (req, res) => {
  // return the ip address of the client
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  // response as json
  res.json({ ip });
});

// get route which takes ?userId=2, then will delete all users greater than or equal 2, also delete all order and transacations
app.get("/delete", async (req, res) => {
  return "cannot delete";
  const userId = req.query.userId;
  if (userId == 1) {
    res.send("Cannot delete admin");
    return;
  }
  try {
    await User.deleteMany({ userId: { $gte: userId } });
    await Order.deleteMany({ userId: { $gte: userId } });
    await Transaction.deleteMany({
      $or: [{ fromId: userId }, { receiverId: userId }],
    });
    res.send("Deleted");
  } catch (error) {
    res.send(error);
  }
});

// Routes
app.use("/api/home", homeRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/test", testRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// getUserInfo("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd")
listenToEvents();
scheduleUserSync()
// handleMissingUsers().then((e)=>console.log(e))

// getEventLogs()

// getSlotInfo("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd")
// getCurrentSlot("0xb1d2CEaCA4e20904a4359eC6c993706b2b404fd1").then((data)=> console.log(data))
// getUserActiveSlots("0x786a7E3DD514E644f88DBE198A327Ab1CB6D8676").then((data) =>
//   console.log("getUserActiveSlots", data)
// );
// getUserIncome("0x786a7E3DD514E644f88DBE198A327Ab1CB6D8676").then((data) =>
//   console.log(data)
// );
// getCurrentSlot("0xb1d2CEaCA4e20904a4359eC6c993706b2b404fd1").then((data)=> console.log(data))
// const referreInfo =  getUserInfo("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd").then((data)=> console.log(Number(data.data[0])))
// getSlotData(0).then((data) => console.log(data));
// getUserInfo("0x752d8836b2Bc92d8838668188CFbbD74a309F982").then((data) =>
//   console.log(data)
// );

// getLevelReferralDetails("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd", 1).then(
//   (data) => {
//     const convertedDetails = JSON.parse(
//       JSON.stringify(data, (_, value) =>
//         typeof value === "bigint" ? value.toString() : value
//       )
//     );
//     console.log(convertedDetails.data);
//   }
// );

// Convert BigInt fields to string

// getUserReferralStats("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd").then((data) =>
//   console.log("getUserReferralStats", data)
// );

// getUserStats("0x786a7E3DD514E644f88DBE198A327Ab1CB6D8676").then((data) =>
//   console.log("getUserStats", data)
// );
// getAdminStats().then((data)=>console.log(data))

// getCurrentSlot("0x91fBa4A117dC5B356901Ee88d708432636995403").then((data) =>
//   console.log("getUserSlot", data)
// );

// upgradeUserSlot("0x105E18D685d22eDF2d7a3dEb50a3A37F26E1C88D", 10).then((data) =>
//   console.log(data)
// );
