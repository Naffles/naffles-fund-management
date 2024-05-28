const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const walletBalanceSchema = new Schema({
  userRef: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  balances: {
    eth: {
      type: String,
      default: "0",
    },
    sol: {
      type: String,
      default: "0",
    },
  },
  fundingBalances: { // balance that waiting to withdraw
    eth: {
      type: String,
      default: "0",
    },
    sol: {
      type: String,
      default: "0",
    },
  },
}, { timestamps: true });


module.exports = mongoose.model("WalletBalance", walletBalanceSchema);
