const express = require("express");
const authRoutes = require("./routes/authRoutes");
const eventRoutes = require("./routes/eventRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");

const app = express();

app.use(express.json());

app.use("/", authRoutes);
app.use("/", eventRoutes);
app.use("/", registrationRoutes);

app.use(errorMiddleware);

module.exports = app;
