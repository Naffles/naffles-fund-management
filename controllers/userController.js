const mongoose = require("mongoose");
const { setAsync } = require("../config/redisClient");
const Deposit = require("../models/transactions/deposit");
const Withdraw = require("../models/transactions/withdraw");
const WalletAddress = require("../models/user/walletAddress");
const { findOrCreateWalletBalance, updateTreasuryBalance, updateUserWalletHistory } = require("../utils/helpers");

exports.depositTokens = async (coin, address, amount, txHash, network, blockNumber, targetAddressForUntilSignature) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const coinType = coin.toLowerCase();
    const wallet = await WalletAddress.findOne({ address }).session(session);
    if (!wallet) {
      console.log("No user account detected: ", address);
      await session.abortTransaction();
      return;
    }

    // Verify the transaction is not already in the database
    const existingDeposit = await Deposit.findOne({ transactionHash: txHash }).session(session);

    if (existingDeposit) {
      console.log("Transaction already exists in the database: ", txHash);
      // update untilSignature (txHash) if existing
      await setAsync(`solanaServerAddressUntilSignature:${targetAddressForUntilSignature}`, txHash);

      await session.abortTransaction();
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
    await newDepositTransaction.save({ session });

    await updateTreasuryBalance(coinType, amount, true, session);

    const walletBalance = await findOrCreateWalletBalance(wallet.userRef, session);
    const currentBalance = BigInt(walletBalance.balances.get(coinType) || "0");
    const updatedBalance = (currentBalance + BigInt(amount)).toString();
    walletBalance.balances.set(coinType, updatedBalance);
    await walletBalance.save({ session });

    await updateUserWalletHistory(wallet.userRef, newDepositTransaction._id, coinType, amount, true, session);

    console.log("Deposit successful");
    // update untilSignature (txHash) if all goes well
    await setAsync(`solanaServerAddressUntilSignature:${targetAddressForUntilSignature}`, txHash);


    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error(`Error deposit updating wallet balance on ${network}:`, error?.errorResponse?.errmsg || error);
  } finally {
    session.endSession();
  }
};

exports.withdrawTokens = async (coin, address, amount, txHash, network, blockNumber, targetAddressForUntilSignature) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const coinType = coin.toLowerCase();
    const wallet = await WalletAddress.findOne({ address }).session(session);
    if (!wallet) {
      console.log("No user account detected:", address);
      await session.abortTransaction();
      return;
    }

    // Find pending withdrawal document
    const withdrawDocument = await Withdraw.findOne({
      userRef: wallet.userRef,
      status: 'pending',
      network,
      amount: amount.toString(),
      coinType,
    }).session(session);

    if (!withdrawDocument) {
      console.log("No pending withdraw document found for: ", wallet.userRef);
      // update untilSignature (txHash) if existing
      await setAsync(`solanaServerAddressUntilSignature:${targetAddressForUntilSignature}`, txHash);

      await session.abortTransaction();
      return;
    }

    await updateTreasuryBalance(coinType, amount, false, session);
    const walletBalance = await findOrCreateWalletBalance(wallet.userRef, session);
    const currentFundingBalance = BigInt(walletBalance.fundingBalances.get(coinType) || "0");
    const updatedFundingBalance = currentFundingBalance < BigInt(amount) ? BigInt(0) : currentFundingBalance - BigInt(amount);
    walletBalance.fundingBalances.set(coinType, updatedFundingBalance.toString());
    await walletBalance.save({ session });

    await updateUserWalletHistory(wallet.userRef, withdrawDocument._id, coinType, amount, false, session);

    withdrawDocument.status = 'approved';
    withdrawDocument.transactionHash = txHash;
    withdrawDocument.blockNumber = blockNumber;
    await withdrawDocument.save({ session });
    // update untilSignature (txHash) if all goes well
    await setAsync(`solanaServerAddressUntilSignature:${targetAddressForUntilSignature}`, txHash);

    await session.commitTransaction();
    console.log("Withdraw successful");
  } catch (error) {
    await session.abortTransaction();
    console.error("Error withdraw updating wallet balance:", error);
  } finally {
    session.endSession();
  }
};
