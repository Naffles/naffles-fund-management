const mongoose = require("mongoose");
const { Schema } = mongoose;

const treasurySchema = new Schema({
  balances: {
    eth: {
      type: String,
      default: "0",
    },
    sol: {
      type: String,
      default: "0",
    },
    // btc: {
    //   type: String,
    //   default: "0",
    // },
  },
}, { timestamps: true });

const Treasury = mongoose.model("Treasury", treasurySchema);

const initializeTreasury = async () => {
  try {
    const treasury = await Treasury.findOne({});
    if (!treasury) {
      const newTreasury = new Treasury();
      await newTreasury.save();
      console.log("Treasury initialized with default values.");
    } else {
      console.log("Treasury already exists.");
    }
  } catch (error) {
    console.error("Error initializing treasury:", error);
  }
};

module.exports = { Treasury, initializeTreasury };
