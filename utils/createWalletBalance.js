const WalletBalance = require("../models/user/walletBalance");

const createWalletBalance = async (userId) => {
  try {
    const existingBalance = await WalletBalance.findOne({ userRef: userId });
    if (!existingBalance) {
      const newWalletBalance = new WalletBalance({ userRef: userId });
      await newWalletBalance.save();
      console.log(`WalletBalance created for user: ${userId}`);
      return newWalletBalance;
    }
  } catch (error) {
    console.error("Error creating wallet balance:", error);
  }
};

module.exports = createWalletBalance

