const { Alchemy, AlchemySubscription } = require("alchemy-sdk");
const alchemyConfigs = require('../config/alchemyConfig');
const { depositTokens, withdrawTokens } = require("../controllers/userController");
const { ethers } = require('ethers');
const Deposit = require("../models/transactions/deposit");
const Withdraw = require("../models/transactions/withdraw");
const { fetchSupportedTokens } = require("../utils/helpers");

let EVM_SUPPORTED_TOKENS = {};

const createAlchemyInstances = (networks) => {
  const instances = {};
  networks.forEach((network) => {
    if (alchemyConfigs[network]) {
      instances[network] = new Alchemy(alchemyConfigs[network]);
    } else {
      console.error(`Alchemy configuration for network "${network}" not found`);
    }
  });
  return instances;
};

const getLatestBlockNumber = async (network) => {
  const deposit = await Deposit.findOne({ network }).sort({ blockNumber: -1 });
  const withdraw = await Withdraw.findOne({ network }).sort({ blockNumber: -1 });

  const depositBlockNumber = deposit?.blockNumber || 0;
  const withdrawBlockNumber = withdraw?.blockNumber || 0;

  const latestBlockNumber = Math.max(depositBlockNumber, withdrawBlockNumber);
  // Convert to hexadecimal and ensure it has '0x' prefix
  const latestBlockNumberHex = `0x${latestBlockNumber.toString(16)}`;
  return latestBlockNumberHex;
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getUserTransfers = async (alchemyInstance, addresses) => {
  const network = alchemyInstance.core.config.network;
  // find the minumum block number
  const blockNumber = await getLatestBlockNumber(network);
  const { supportedTokens, isDocumentUpdated, isNativeTokenPresent } = await fetchSupportedTokens(network);
  EVM_SUPPORTED_TOKENS[network] = supportedTokens;
  for (const address of addresses) {
    try {
      const fromTransfers = await alchemyInstance.core.getAssetTransfers({
        fromBlock: blockNumber,
        fromAddress: address,
        category: ["external", "erc20"],
      });
      // Wait for 5 seconds before making the next API call
      await sleep(5 * 1000);
      const toTransfers = await alchemyInstance.core.getAssetTransfers({
        fromBlock: blockNumber,
        toAddress: address,
        category: ["external", "erc20"],
      });

      // Combine the results
      const allTransfers = [...fromTransfers.transfers, ...toTransfers.transfers];
      allTransfers.sort((a, b) => parseInt(a.blockNum, 16) - parseInt(b.blockNum, 16));

      for (const transfer of allTransfers) {
        try {
          const blockNumDecimal = parseInt(transfer.blockNum, 16);
          const txHash = transfer.hash;
          const actionType = transfer.to && transfer.to.toLowerCase() === address.toLowerCase() ? 'deposit' : 'withdraw';
          const value = transfer.rawContract && transfer.rawContract.value ? BigInt(transfer.rawContract.value) : null;
          const contractAddress = transfer.rawContract && transfer.rawContract.address ? transfer.rawContract.address.toLowerCase() : null;
          const category = transfer.category;
          const from = ethers.getAddress(transfer.from);
          const to = ethers.getAddress(transfer.to);

          if (category === 'external' && isNativeTokenPresent) {
            await handleExternalTransfer(actionType, transfer.asset, from, to, value, txHash, network, blockNumDecimal);
          } else if (category === 'erc20') {
            await handleErc20Transfer(actionType, contractAddress, from, to, value, txHash, network, blockNumDecimal);
          }
        } catch (transferError) {
          console.error(`Error processing transfer: ${transfer.hash}`, transferError);
        }
      }
    } catch (fetchError) {
      console.error(`Error fetching transfers for address: ${address}`, fetchError);
    }
  }
};

const handleExternalTransfer = async (actionType, asset, from, to, value, txHash, network, blockNumDecimal) => {
  try {
    var coinType = asset.toLowerCase();
    if (network !== "eth-mainnet" && network !== "eth-sepolia") {
      coinType = `${network[0]?.toLowerCase()}eth`;
    }
    if (actionType === 'deposit') {
      // console.log("eth deposited: ", coinType, from, value, txHash, network, blockNumDecimal);
      await depositTokens(coinType, from, value, txHash, network, blockNumDecimal);
    } else {
      // console.log("withdraw: ", coinType, to, value, txHash, network, blockNumDecimal);
      await withdrawTokens(coinType, to, value, txHash, network, blockNumDecimal);
    }
  } catch (externalTransferError) {
    console.error(`Error handling external transfer: ${txHash}`, externalTransferError);
  }
};

const handleErc20Transfer = async (actionType, contractAddress, from, to, value, txHash, network, blockNumDecimal) => {
  try {
    const token = EVM_SUPPORTED_TOKENS[network].find(token => token.address === contractAddress);
    if (token && token.network == network) {
      const coinType = token.symbol;
      if (actionType === 'deposit') {
        // console.log("erc20 deposited: ", coinType, from, value, txHash, network, blockNumDecimal);
        await depositTokens(coinType, from, value, txHash, network, blockNumDecimal);
      } else {
        // console.log("withdraw: ", coinType, to, value, txHash, network, blockNumDecimal);
        await withdrawTokens(coinType, to, value, txHash, network, blockNumDecimal);
      }
    } else {
      // console.log("token not supported: ", token, contractAddress, network, actionType);
    }
  } catch (erc20TransferError) {
    console.error(`Error handling ERC20 transfer: ${txHash}`, erc20TransferError);
  }
};


module.exports = {
  createAlchemyInstances,
  getUserTransfers
};
