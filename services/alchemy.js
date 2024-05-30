const { Alchemy, AlchemySubscription } = require("alchemy-sdk");
const alchemyConfigs = require('../config/alchemyConfig');
const { depositTokens, withdrawTokens } = require("../controllers/userController");
const { ethers } = require('ethers');

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

const subscribeToNewBlocks = (alchemyInstance) => {
  alchemyInstance.ws.on("block", (blockNumber) => {
    console.log("The latest block number is", blockNumber);
  });
};

const subscribeToMinedTransactions = (alchemyInstance, addresses) => {
  addresses.forEach((address) => {
    alchemyInstance.ws.on(
      {
        method: AlchemySubscription.MINED_TRANSACTIONS,
        addresses: [{ to: address }, { from: address }],
        includeRemoved: true,
        hashesOnly: false,
      },
      async (tx) => {
        tx = tx.transaction;
        console.log("transaction : ", tx);
        // Invalidate if the to and from of the user is the same.
        if (tx.to === tx.from) {
          console.log("Transaction sent to itself");
          return;
        }
        const action = (tx.to === address) ? 'deposit' : 'withdraw';
        const cointType = 'eth'
        const txHash = (tx.hash);
        const chainId = tx.chainId;
        try {
          if (action == 'deposit') {
            await depositTokens(
              cointType,
              ethers.getAddress(tx.from),
              BigInt(tx.value),
              txHash,
              chainId
            );
          } else { // 'withdraw
            await withdrawTokens(
              cointType,
              ethers.getAddress(tx.to),
              BigInt(tx.value),
              txHash,
              'eth'
            );
          }
        } catch (error) {
          console.error('Error updating balance:', error);
        }
      }
    );
  });
};


module.exports = {
  createAlchemyInstances,
  subscribeToNewBlocks,
  subscribeToMinedTransactions
};
