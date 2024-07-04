const { getAsync, setAsync } = require("../config/redisClient");
const AllowableTokenContractsForLotteries = require("../models/admin/allowableTokenContractsForLotteries");
const { Treasury, initializeTreasury } = require("../models/analytics/treasury");
const UserDepositAndWithdrawHistory = require("../models/analytics/userDepositAndWithdrawHistory");
const WalletBalance = require("../models/user/walletBalance");
const mongoose = require("mongoose");

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

const fetchSupportedTokens = async (network) => {
  try {
    // Check if a native token is present
    const isNativeTokenPresent = await AllowableTokenContractsForLotteries.exists({ network, isNativeToken: true }) ? true : false;
    
    const tokens = await AllowableTokenContractsForLotteries
      .find({ network })
      .sort({ updatedAt: -1 });
    // Map the documents to the desired format
    var isDocumentUpdated = false;
    const supportedTokens = tokens.map(token => ({
      address: network.slice(0, 3) == 'sol' ? token.contractAddress : token.contractAddress.toLowerCase(),
      symbol: token.ticker,
      decimal: token.decimal,
      network: token.network,
      isNativeToken: token.isNativeToken
    }));

    if (tokens.length > 0) {
      const lastUpdatedTimestamp = tokens[0].updatedAt;
      const lastUpdate = await getAsync(`networkLastUpdated:${network}`);
      if (lastUpdatedTimestamp != lastUpdate) {
        await setAsync(`networkLastUpdated:${network}`, lastUpdatedTimestamp);
        isDocumentUpdated = true;
      }
    }
    return { supportedTokens, isDocumentUpdated, isNativeTokenPresent };
  } catch (error) {
    console.error("Error fetching supported tokens:", error);
  }
};

module.exports = {
  findOrCreateWalletBalance,
  updateTreasuryBalance,
  updateUserWalletHistory,
  fetchSupportedTokens
};
