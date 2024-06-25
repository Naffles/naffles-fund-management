const { Treasury, initializeTreasury } = require("../models/analytics/treasury");
const UserDepositAndWithdrawHistory = require("../models/analytics/userDepositAndWithdrawHistory");
const WalletBalance = require("../models/user/walletBalance");

const findOrCreateWalletBalance = async (userRef) => {
  let walletBalance = await WalletBalance.findOne({ userRef });
  if (!walletBalance) {
    walletBalance = new WalletBalance({ userRef });
    await walletBalance.save();
  }
  return walletBalance;
};

const updateTreasuryBalance = async (coinType, amount, isDeposit = true) => {
  let treasury = await Treasury.findOne();
  if (!treasury) {
    await initializeTreasury();
    treasury = await Treasury.findOne();
  }

  const currentBalance = BigInt(treasury.balances.get(coinType) || "0");
  const newBalance = isDeposit ? currentBalance + BigInt(amount) : currentBalance < BigInt(amount) ? BigInt(0) : currentBalance - BigInt(amount);
  treasury.balances.set(coinType, newBalance.toString());
  await treasury.save();
};

const updateUserWalletHistory = async (userRef, actionId, coinType, amount, isDeposit = true) => {
  let lastHistory = await UserDepositAndWithdrawHistory.findOne({ userRef }).sort({ createdAt: -1 });

  const newHistory = new UserDepositAndWithdrawHistory({
    userRef,
    actionId,
    totalDepositedAmount: new Map(),
    totalWithdrawnAmount: new Map(),
  });

  if (lastHistory) {
    lastHistory.totalDepositedAmount.forEach((value, key) => {
      newHistory.totalDepositedAmount.set(key, value);
    });
    lastHistory.totalWithdrawnAmount.forEach((value, key) => {
      newHistory.totalWithdrawnAmount.set(key, value);
    });
  }

  const currentTotal = BigInt(newHistory[isDeposit ? 'totalDepositedAmount' : 'totalWithdrawnAmount'].get(coinType) || "0");
  const newTotal = (currentTotal + BigInt(amount)).toString();
  newHistory[isDeposit ? 'totalDepositedAmount' : 'totalWithdrawnAmount'].set(coinType, newTotal);

  await newHistory.save();
};

module.exports = {
  findOrCreateWalletBalance,
  updateTreasuryBalance,
  updateUserWalletHistory
};
