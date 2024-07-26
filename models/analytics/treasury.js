const mongoose = require("mongoose");
const { Schema } = mongoose;

const treasurySchema = new Schema({
  balances: {
    type: Map,
    of: String,
    default: {},
  },
}, { timestamps: true });

const Treasury = mongoose.model("Treasury", treasurySchema);

const initializeTreasury = async (session = null) => {
  try {
    let treasury;
    if (session) {
      treasury = await Treasury.findOne({}).session(session);
    } else {
      treasury = await Treasury.findOne({});
    }

    if (!treasury) {
      const newTreasury = new Treasury({});
      if (session) {
        await newTreasury.save({ session });
      } else {
        await newTreasury.save();
      }
      console.log("Treasury initialized with default values.");
    } else {
      console.log("Treasury already exists.");
    }
  } catch (error) {
    console.error("Error initializing treasury:", error);
  }
};


module.exports = { Treasury, initializeTreasury };
