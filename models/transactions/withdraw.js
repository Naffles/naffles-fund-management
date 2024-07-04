const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const withdrawSchema = new Schema({
  userRef: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  trackingNumber: {
    type: Number,
    required: true,
  },
  toAddress: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: String,
    default: "0",
  },
  transactionHash: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  coinType: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected', 'debited-internally'],
    default: 'pending',
    index: true,
  },
  network: {
    type: String,
    required: true,
  },
  blockNumber: {
    type: Number,
    sparse: true,
    index: true,
  },
  currentTreasuryBalance: {
    type: String,
  },
  currentUserTotalDeposited: {
    type: String,
  },
  currentUserTotalWithdrawn: {
    type: String,
  },
}, { timestamps: true });

withdrawSchema.pre("validate", async function (next) {
  if (this.isNew) {
    try {
      // Check if this is a new document
      const lastWithdraw = await this.constructor.findOne({ userRef: this.userRef })
        .sort({ trackingNumber: -1 });

      if (lastWithdraw && lastWithdraw.trackingNumber !== undefined) {
        // If last withdraw has a trackingNumber, increment it
        this.trackingNumber = lastWithdraw.trackingNumber + 1;
      } else {
        // If no withdraw or no trackingNumber, calculate the tracking number
        const withdrawCount = await this.constructor.countDocuments({ userRef: this.userRef });
        this.trackingNumber = withdrawCount + 1;
      }
    } catch (error) {
      console.error("Error in pre-save hook:", error); // Debugging statement
      return next(error);
    }
  }
  next();
});

module.exports = mongoose.model("Withdraw", withdrawSchema);
