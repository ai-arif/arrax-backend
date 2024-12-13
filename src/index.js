require("dotenv").config();
const express = require("express");
const logger = require("./utils/logger.cjs");
const morgan = require("morgan");
const app = express();
const port = process.env.PORT || 5000;
const path = require("path");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const cors = require("cors");

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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
