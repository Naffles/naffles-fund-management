const mongoose = require("mongoose");
const { initializeTreasury } = require("../models/analytics/treasury");
const runMigrations = require("../resources/scripts/runMigrations");

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
      runMigrations()
        .then((result) => {
          console.log('Migrations completed successfully');
          console.log('stdout:', result.stdout);
          console.log('stderr:', result.stderr);
        })
        .catch((error) => {
          console.error('Migrations failed');
          console.error('Exit code:', error.code);
          console.error('stdout:', error.stdout);
          console.error('stderr:', error.stderr);
        });
      console.log("Successfully connected to DB");
    })
    .catch((e) => {
      console.error(e);
      setTimeout(connectWithRetry, 5000); // Retry connection every 5 seconds
    });
};

module.exports = connectWithRetry;
