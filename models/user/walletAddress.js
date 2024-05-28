const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const walletAddressSchema = new Schema({
  userRef: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  address: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  walletType: {
    type: String,
    required: true,
    enum: ["phantom", "metamask"]
  },
  network: {
    type: String,
    required: true,
    enum: ["eth", "sol"],
    index: true,
  },
});

module.exports = mongoose.model("WalletAddress", walletAddressSchema);
