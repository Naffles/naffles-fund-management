const { Treasury, initializeTreasury } = require("../models/analytics/treasury");
const UserDepositAndWithdrawHistory = require("../models/analytics/userDepositAndWithdrawHistory");
const Deposit = require("../models/transactions/deposit");
const Withdraw = require("../models/transactions/withdraw");
const WalletAddress = require("../models/user/walletAddress");
const WalletBalance = require("../models/user/walletBalance");
const createWalletBalance = require("../utils/createWalletBalance");

exports.depositTokens = async (coinType, address, amount, txHash, network) => {
  try {
    // find user connected to the wallet
    const wallet = await WalletAddress.findOne({ address: address });
    if (!wallet) {
      console.log("No user account detected: ", address);
      return;
    }
    // create wallet balance if not existing
    await createWalletBalance(wallet.userRef);
    // save deposit data
    console.log("transaction hash: ", txHash, typeof txHash);

    const newDepositTransaction = new Deposit({
      userRef: wallet.userRef,
      fromAddress: address,
      amount: amount,
      transactionHash: txHash,
      coinType: coinType,
      chainId: network,
      transactionDetails: 'NA',
    });
    await newDepositTransaction.save();

    // update treasury walet balance
    let treasury = await Treasury.findOne();
    if (!treasury) {
      console.log("no treasury document");
    }
    const currentTotalTreasuryBalance = treasury?.balances[coinType]
      ? BigInt(treasury.balances[coinType].toString())
      : BigInt(0);
    const newTotalTreasuryBalance = currentTotalTreasuryBalance + amount;
    treasury.balances[coinType] = newTotalTreasuryBalance.toString();
    await treasury.save();

    // update wallet's balance
    let walletBalance = await WalletBalance.findOne({ userRef: wallet.userRef });
    if (!walletBalance) {
      console.log("No wallet found for address: ", address);
      console.log("creating new wallet for: ", wallet.userRef);
      walletBalance = new WalletBalance({ userRef: wallet.userRef });
      await walletBalance.save();
    }

    const currentBalance = walletBalance.balances[coinType]
      ? BigInt(walletBalance.balances[coinType].toString())
      : BigInt(0);
    const updatedBalance = currentBalance + amount;
    walletBalance.balances[coinType] = updatedBalance.toString();
    await walletBalance.save();

    // Update user's deposit history 
    let userWalletHistory = await UserDepositAndWithdrawHistory
      .findOne({ userRef: wallet.userRef })
      .sort({ createdAt: -1 });

    const newUserWalletHistory = new UserDepositAndWithdrawHistory({
      actionId: newDepositTransaction._id,
      userRef: wallet.userRef,
      totalDepositedAmount: {
        eth: userWalletHistory?.totalDepositedAmount?.eth || "0",
        sol: userWalletHistory?.totalDepositedAmount?.sol || "0",
      },
      totalWithdrawnAmount: {
        eth: userWalletHistory?.totalWithdrawnAmount?.eth || "0",
        sol: userWalletHistory?.totalWithdrawnAmount?.sol || "0",
      }
    });

    const currentTotalDeposit = userWalletHistory?.totalDepositedAmount[coinType]
      ? BigInt(userWalletHistory.totalDepositedAmount[coinType].toString())
      : BigInt(0);
    const newTotalDeposit = currentTotalDeposit + amount;
    newUserWalletHistory.totalDepositedAmount[coinType] = newTotalDeposit.toString();

    await newUserWalletHistory.save();
    console.log("deposit successful");
  } catch (error) {
    console.error("Error deposit updating wallet balance:", error);
    // sendResponse(res, 500, "An error occurred while updating the wallet balance.");
  }
};

exports.withdrawTokens = async (coinType, address, amount, txHash, network) => {
  try {
    // find user connected to the wallet
    const wallet = await WalletAddress.findOne({ address: address });
    if (!wallet) {
      console.log("No user account detected: ", address);
      return;
    }
    // create wallet balance if not existing
    await createWalletBalance(wallet.userRef);
    // save deposit data
    console.log("transaction details: ", coinType, address, amount, txHash, network)
    // search for withdraw document
    // update the status to approved
    const withdrawDocument = await Withdraw.findOneAndUpdate({
      userRef: wallet.userRef,
      status: 'pending',
      network: network,
      amount: amount.toString()
    },
      {
        status: 'approved',
        transactionDetails: 'NA',
        transactionHash: txHash,
      },
      { new: true } // This option ensures the updated document is returned
    );
    if (!withdrawDocument) {
      console.log("No pending withdraw document found");
      return;
    }

    // Manually update currentUserTotalWithdrawn
    if (withdrawDocument.currentUserTotalWithdrawn) {
      const currentWithdrawn = BigInt(withdrawDocument.currentUserTotalWithdrawn);
      const newWithdrawn = currentWithdrawn + amount;
      withdrawDocument.currentUserTotalWithdrawn = newWithdrawn.toString();
    } else {
      withdrawDocument.currentUserTotalWithdrawn = amount.toString();
    }
    await withdrawDocument.save();

    // update treasury walet balance
    let treasury = await Treasury.findOne();
    if (!treasury) {
      console.log("creating treasury document");
      await initializeTreasury();
    }
    const currentTotalTreasuryBalance = treasury?.balances[coinType]
      ? BigInt(treasury.balances[coinType].toString())
      : BigInt(0);
    var newTotalTreasuryBalance;
    if (currentTotalTreasuryBalance < amount) {
      newTotalTreasuryBalance = 0;
    } else {
      newTotalTreasuryBalance = currentTotalTreasuryBalance - amount;
    }
    treasury.balances[coinType] = newTotalTreasuryBalance.toString();
    await treasury.save();

    // update wallet's balance
    let walletBalance = await WalletBalance.findOne({ userRef: wallet.userRef });
    if (!walletBalance) {
      console.log("No wallet found for address: ", address);
      console.log("creating new wallet for: ", wallet.userRef);
      walletBalance = new WalletBalance({ userRef: wallet.userRef });
      await walletBalance.save();
      console.log("No wallet balance found for address: ", address);
    }

    const currentBalance = walletBalance.fundingBalances[coinType]
      ? BigInt(walletBalance.fundingBalances[coinType].toString())
      : BigInt(0);
    const updatedBalance = currentBalance - amount;
    walletBalance.fundingBalances[coinType] = updatedBalance.toString();
    await walletBalance.save();

    // Update user's withdraw history 
    let userWalletHistory = await UserDepositAndWithdrawHistory
      .findOne({ userRef: wallet.userRef })
      .sort({ createdAt: -1 });

    const newUserWalletHistory = new UserDepositAndWithdrawHistory({
      actionId: withdrawDocument._id,
      userRef: wallet.userRef,
      totalDepositedAmount: {
        eth: userWalletHistory?.totalDepositedAmount?.eth || "0",
        sol: userWalletHistory?.totalDepositedAmount?.sol || "0",
      },
      totalWithdrawnAmount: {
        eth: userWalletHistory?.totalWithdrawnAmount?.eth || "0",
        sol: userWalletHistory?.totalWithdrawnAmount?.sol || "0",
      }
    });

    const currentTotalWithdrawn = userWalletHistory?.totalWithdrawnAmount[coinType]
      ? BigInt(userWalletHistory.totalWithdrawnAmount[coinType].toString())
      : BigInt(0);
    const newTotalWithdrawn = currentTotalWithdrawn + amount;
    newUserWalletHistory.totalWithdrawnAmount[coinType] = newTotalWithdrawn.toString();
    await newUserWalletHistory.save();
    console.log("withdraw successful");
  } catch (error) {
    console.error("Error withdraw updating wallet balance:", error);
    // sendResponse(res, 500, "An error occurred while updating the wallet balance.");
  }

}