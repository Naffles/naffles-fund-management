const { EVM_NETWORKS, SOLANA_NETWORKS, EVM_SERVER_ADDRESS, SOLANA_SERVER_ADDRESS } = require('./config/config');
const { createAlchemyInstances, getUserTransfers } = require('./services/alchemy');
const { createSolanaInstances, findAssociatedTokenAddress, processAllTransactions } = require('./services/solana');
const connectWithRetry = require("./config/database");
const { fetchSupportedTokens } = require('./utils/helpers');

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
    let isRunning = false;

    const runSolanaTasks = async () => {
      if (isRunning) {
        console.log("runSolanaTasks is already running, skipping this iteration.");
        return;
      }
      isRunning = true;
      try {
        for (const network of Object.keys(solanaInstances)) {
          const solanaInstance = solanaInstances[network];
          const { supportedTokens, isDocumentUpdated, isNativeTokenPresent } = await fetchSupportedTokens(`sol-${network}`);
          console.log("INITIALIZED");
          try {
            if (isNativeTokenPresent) {
              await processAllTransactions(solanaInstance, solanaServerAddress, `sol-${network}`, false, 'sol');
            }
            for (const token of supportedTokens) {
              const { address, symbol, decimal, network, isNativeToken } = token;
              if (!isNativeToken) {
                const serverAddress = await findAssociatedTokenAddress(solanaServerAddress, address);
                // spl tokens
                await processAllTransactions(
                  solanaInstance,
                  serverAddress,
                  network,
                  true,
                  symbol,
                )
              }
            }
            console.log("END----");
          } catch (error) {
            console.error(`Error subscribing to ${network} mined transactions`, error.message);
          }
        }
      } finally {
        isRunning = false;
      }
    };

    // Run the task immediately once
    await runSolanaTasks();
    // // Set interval to check for updates and re-run the task if needed 61 seconds
    setInterval(runSolanaTasks, 61 * 1000);

  } catch (error) {
    console.error("Error during initialization:", error.message);
  }
})();