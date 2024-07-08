const Deposit = require("../models/transactions/deposit");
const Withdraw = require("../models/transactions/withdraw");
const WalletAddress = require("../models/user/walletAddress");
const { findOrCreateWalletBalance, updateTreasuryBalance, updateUserWalletHistory } = require("../utils/helpers");

exports.depositTokens = async (coinType, address, amount, txHash, network, blockNumber) => {
  try {
    const wallet = await WalletAddress.findOne({ address: address });
    if (!wallet) {
      // console.log("No user account detected: ", address);
      return;
    }

    // Verify the transaction is not already in the database
    const existingDeposit = await Deposit.findOne({ transactionHash: txHash });
    if (existingDeposit) {
      // console.log("Transaction already exists in the database: ", txHash);
      return;
    }

    const newDepositTransaction = new Deposit({
      userRef: wallet.userRef,
      fromAddress: address,
      amount,
      transactionHash: txHash,
      coinType,
      network,
      blockNumber
    });
    await newDepositTransaction.save();

    await updateTreasuryBalance(coinType, amount, true);

    const walletBalance = await findOrCreateWalletBalance(wallet.userRef);
    const currentBalance = BigInt(walletBalance.balances.get(coinType) || "0");
    const updatedBalance = (currentBalance + BigInt(amount)).toString();
    walletBalance.balances.set(coinType, updatedBalance);
    await walletBalance.save();

    await updateUserWalletHistory(wallet.userRef, newDepositTransaction._id, coinType, amount, true);
    console.log("deposit successful");
  } catch (error) {
    console.error(`Error deposit updating wallet balance on ${network}:`, error?.errorResponse?.errmsg || error);
  }
};

exports.withdrawTokens = async (coinType, address, amount, txHash, network, blockNumber) => {
  try {
    const wallet = await WalletAddress.findOne({ address });
    if (!wallet) {
      console.log("No user account detected:", address);
      return;
    }

    // Find pending withdrawal document
    const withdrawDocument = await Withdraw.findOne({
      userRef: wallet.userRef,
      status: 'pending',
      network,
      amount: amount.toString(),
      coinType,
    });

    if (!withdrawDocument) {
      // console.log("No pending withdraw document found for: ", wallet.userRef);
      return;
    }

    await updateTreasuryBalance(coinType, amount, false);
    const walletBalance = await findOrCreateWalletBalance(wallet.userRef);
    const currentFundingBalance = BigInt(walletBalance.fundingBalances.get(coinType) || "0");
    const updatedFundingBalance = currentFundingBalance < BigInt(amount) ? BigInt(0) : currentFundingBalance - BigInt(amount);
    walletBalance.fundingBalances.set(coinType, updatedFundingBalance.toString());
    await walletBalance.save();

    await updateUserWalletHistory(wallet.userRef, withdrawDocument._id, coinType, amount, false);

    withdrawDocument.status = 'approved';
    withdrawDocument.transactionHash = txHash;
    withdrawDocument.blockNumber = blockNumber;
    await withdrawDocument.save();

    console.log("Withdraw successful");
  } catch (error) {
    console.error("Error withdraw updating wallet balance:", error);
  }
};
