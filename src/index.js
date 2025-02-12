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

const { handleMissingUsers } = require("./cmd/runner");
const job = require("./cmd/runner");
const scheduleUserSync = require("./cmd/runner");
const { scheduleDailyReset } = require("./cmd/resetDailyStats");
const { getMissingUserIds } = require("./services/userService");

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
});

app.get("/missing-users", async (req, res) => {
  const data = await getMissingUserIds();
  res.json(data);
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
scheduleUserSync();
scheduleDailyReset();
