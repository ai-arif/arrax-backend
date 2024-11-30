require("dotenv").config();
const express = require("express");
const app = express();
const port = process.env.PORT || 5000;
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const cors = require("cors");

// Middleware
app.use(cors());
app.use(express.json());

connectDB();
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Routes
app.use("/api/users", userRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
