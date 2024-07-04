const mongoose = require("mongoose");
const { Schema } = mongoose;

// also list of contracts for token 
const allowableTokenContractsForLotteriesSchema = new Schema({
  name: String,
  ticker: String,
  decimal: Number,
  network: String,
  contractAddress: String,
  isNativeToken: Boolean
}, { timestamps: true });

module.exports = mongoose.model(
  "AllowableTokenContractsForLotteries",
  allowableTokenContractsForLotteriesSchema
);