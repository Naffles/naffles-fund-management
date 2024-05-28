const { Alchemy, AlchemySubscription } = require("alchemy-sdk");
const alchemyConfigs = require('../config/alchemyConfig');
const { depositTokens } = require("../controllers/userController");

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
        // Invalidate if the to and from of the user is the same.
        if (tx.to.toLowerCase() === tx.from.toLowerCase()) {
          console.log("Transaction sent to itself");
          return;
        }
        const action = (tx.to.toLowerCase() === address.toLowerCase()) ? 'deposit' : 'withdraw';
        const cointType = 'eth'
        const txHash = (tx.hash).toLowerCase();
        const chainId = tx.chainId
        try {
          if (action == 'deposit') {
            await depositTokens(
              cointType,
              tx.from.toLowerCase(),
              BigInt(tx.value),
              txHash,
              chainId
            );
          } else { // 'withdraw
            await withdrawTokens(
              cointType,
              tx.to.toLowerCase(),
              BigInt(tx.value),
              txHash,
              chainId
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
