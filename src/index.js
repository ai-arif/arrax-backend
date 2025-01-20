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
const cors = require("cors");
const userListener = require("./cmd/userListener");
const { get } = require("http");
const {
  getUserInfo,
} = require("./controllers/RegisterationContractController");
const { listenToEvents, getEventLogs } = require("./cmd/matrixListener");
const { BN } = require("bn.js");
const {
  getCurrentSlotInfo,
  getCurrentSlot,
  getUserActiveSlots,
  getUserIncome,
  getUserSlot,
  getSlotData,
} = require("./controllers/bookingContractController");
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

// Routes
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// getUserInfo("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd")
listenToEvents();
// getEventLogs()

// getSlotInfo("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd")
// getCurrentSlot("0xb1d2CEaCA4e20904a4359eC6c993706b2b404fd1").then((data)=> console.log(data))
// getUserActiveSlots("0xa26934981D50287F62FDbEf54Ae84c815B3E4dd0").then((data) =>
//   console.log("getUserActiveSlots", data)
// );
// getUserIncome("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd").then((data) =>
//   console.log(data)
// );
// getCurrentSlot("0xb1d2CEaCA4e20904a4359eC6c993706b2b404fd1").then((data)=> console.log(data))
// const referreInfo =  getUserInfo("0x4Edcf95aDc616481a6f08a9bEaB934cA6e4040bd").then((data)=> console.log(Number(data.data[0])))
// getSlotData(0).then((data) => console.log(data));
getUserSlot("0x42bCcAdd3F48DC26EA986a98A2A6e070c2F26b4a").then((data) =>
  console.log("getUserSlot", data)
);
