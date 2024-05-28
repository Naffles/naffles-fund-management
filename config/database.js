const mongoose = require("mongoose");
const { initializeTreasury } = require("../models/analytics/treasury");

const connectWithRetry = () => {
  console.log("Attempting to connect to MongoDB...");
  mongoose
    .connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // useFindAndModify: false,
      autoIndex: process.env.NODE_ENV !== 'production',
    })
    .then(async () => {
      await initializeTreasury();
      console.log("Successfully connected to DB");
    })
    .catch((e) => {
      console.error(e);
      setTimeout(connectWithRetry, 5000); // Retry connection every 5 seconds
    });
};

module.exports = connectWithRetry;
