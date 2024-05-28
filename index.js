const { EVM_NETWORKS, SOLANA_NETWORKS, EVM_SERVER_ADDRESS, SOLANA_SERVER_ADDRESS } = require('./config/config');
const { createAlchemyInstances, subscribeToMinedTransactions } = require('./services/alchemy');
const { createSolanaInstances, subscribeToTransactions } = require('./services/solana');
const connectWithRetry = require("./config/database");

try {

  connectWithRetry();
  const evmNetworks = (EVM_NETWORKS || 'sepolia').split(',');
  const solanaNetworks = (SOLANA_NETWORKS || 'devnet').split(',');

  const evmServerAddress = (EVM_SERVER_ADDRESS || '0x829c609b5EED7A5D53C684B5f8b1d3aa6DE46145').split(',');
  const solanaServerAddress = SOLANA_SERVER_ADDRESS;

  const alchemyInstances = createAlchemyInstances(evmNetworks);
  const solanaInstances = createSolanaInstances(solanaNetworks);

  Object.keys(alchemyInstances).forEach(network => {
    const alchemyInstance = alchemyInstances[network];
    console.log(`Subscribing to ${network}`);
    try {
      subscribeToMinedTransactions(alchemyInstance, evmServerAddress);
    } catch (error) {
      console.error(`Error subscribing to ${network} mined transactions`, error.message);
    }
  });

  Object.keys(solanaInstances).forEach(async (network) => {
    const solanaInstance = solanaInstances[network];
    console.log(`Subscribing to ${network}`);
    try {
      subscribeToTransactions(solanaInstance, solanaServerAddress, network);
    } catch (error) {
      console.error(`Error subscribing to ${network} mined transactions`, error.message);
    }
  });

} catch (error) {
  console.error(error.message);
}

