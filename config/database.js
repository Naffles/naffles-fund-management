const mongoose = require("mongoose");
const { initializeTreasury } = require("../models/analytics/treasury");

const connectWithRetry = async () => {
  console.log("Attempting to connect to MongoDB...");
  return mongoose.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: process.env.NODE_ENV !== 'production',
  }).then(async () => {
    await initializeTreasury();
    console.log("Successfully connected to DB");
  }).catch(async (e) => {
    console.error(e);
    console.log("Retrying connection in 5 seconds...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    return connectWithRetry();
  });
};

module.exports = connectWithRetry;
