const { EVM_NETWORKS, SOLANA_NETWORKS, EVM_SERVER_ADDRESS, SOLANA_SERVER_ADDRESS, SPL_SUPPORTED_TOKENS } = require('./config/config');
const { createAlchemyInstances, getUserTransfers } = require('./services/alchemy');
const { createSolanaInstances, subscribeToTransactions, findAssociatedTokenAddress } = require('./services/solana');
const connectWithRetry = require("./config/database");
const { fetchSupportedTokens } = require('./utils/helpers');
const { delAsync } = require('./config/redisClient');

(async () => {
  try {
    await connectWithRetry(); // Wait for the MongoDB connection
    // Function to be run every 30 seconds
    const runEvmTasks = async () => {
      const evmNetworks = (EVM_NETWORKS || 'sepolia').split(',');
      const evmServerAddress = (EVM_SERVER_ADDRESS || '0x829c609b5EED7A5D53C684B5f8b1d3aa6DE46145').split(',');
      const alchemyInstances = createAlchemyInstances(evmNetworks);
      for (const network of Object.keys(alchemyInstances)) {
        const alchemyInstance = alchemyInstances[network];
        // console.log(`Subscribing to ${network}`);
        try {
          await getUserTransfers(alchemyInstance, evmServerAddress);
        } catch (error) {
          console.error(`Error subscribing to ${network} mined transactions`, error.message);
        }
      }
    };
    // Run the task immediately once
    await runEvmTasks();
    // // Set interval to run the task every 30 seconds
    setInterval(runEvmTasks, 30000);

    const solanaNetworks = (SOLANA_NETWORKS || 'devnet').split(',');
    const solanaServerAddress = SOLANA_SERVER_ADDRESS;
    const solanaInstances = createSolanaInstances(solanaNetworks);

    const runSolanaTasks = async (init = false) => {
      for (const network of Object.keys(solanaInstances)) {
        if (init) {
          await delAsync(`sol-${network}`);
        }
        const solanaInstance = solanaInstances[network];
        const { supportedTokens, isDocumentUpdated, isNativeTokenPresent } = await fetchSupportedTokens(`sol-${network}`);

        if (isDocumentUpdated || init) {
          console.log(`Document updated for ${network}, running subscriptions...`);

          // Unsubscribe existing listeners before subscribing
          if (solanaInstance.subscriptionIds) {
            for (const subscriptionId of solanaInstance.subscriptionIds) {
              solanaInstance.removeOnLogsListener(subscriptionId);
            }
          }

          solanaInstance.subscriptionIds = [];

          try {
            var baseSubscriptionId;
            if (isNativeTokenPresent) {
              baseSubscriptionId = subscribeToTransactions(solanaInstance, solanaServerAddress, `sol-${network}`, false, 'sol', isNativeTokenPresent);
              solanaInstance.subscriptionIds.push(baseSubscriptionId);
            }
            for (const token of supportedTokens) {
              const { address, symbol, decimal, network, isNativeToken } = token;
              if (!isNativeToken) {
                const serverAddress = await findAssociatedTokenAddress(solanaServerAddress, address);
                const tokenSubscriptionId = await subscribeToTransactions(solanaInstance, serverAddress, network, true, symbol, isNativeTokenPresent, baseSubscriptionId);
                solanaInstance.subscriptionIds.push(tokenSubscriptionId);
              }
            }
          } catch (error) {
            console.error(`Error subscribing to ${network} mined transactions`, error.message);
          }
        }
      }
    };

    // Run the task immediately once
    await runSolanaTasks(true);
    // Set interval to check for updates and re-run the task if needed
    setInterval(runSolanaTasks, 31 * 1000);

  } catch (error) {
    console.error("Error during initialization:", error.message);
  }
})();