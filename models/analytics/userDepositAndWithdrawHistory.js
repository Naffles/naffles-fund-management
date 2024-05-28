const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userDepositAndWithdrawHistorySchema = new Schema({
  userRef: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    // unique: true,
    index: true,
  },
  actionId: { // deposit and/or withdraw ids for reference
    type: Schema.Types.ObjectId,
  },
  totalDepositedAmount: {
    eth: {
      type: String,
      default: "0",
    },
    sol: {
      type: String,
      default: "0",
    },
  },
  totalWithdrawnAmount: {
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

module.exports = mongoose.model(
  "UserDepositAndWithdrawHistory",
  userDepositAndWithdrawHistorySchema
);
