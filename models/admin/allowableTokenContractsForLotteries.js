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

// Pre-save hook to set the ticker to lowercase
allowableTokenContractsForLotteriesSchema.pre('save', function (next) {
  if (this.isModified('ticker')) {
    this.ticker = this.ticker.toLowerCase();
  }
  next();
});

module.exports = mongoose.model(
  "AllowableTokenContractsForLotteries",
  allowableTokenContractsForLotteriesSchema
);