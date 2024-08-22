const { EVM_NETWORKS, SOLANA_NETWORKS, EVM_SERVER_ADDRESS, SOLANA_SERVER_ADDRESS } = require('./config/config');
const { createAlchemyInstances, getUserTransfers } = require('./services/alchemy');
const { createSolanaInstances, findAssociatedTokenAddress, processAllTransactions } = require('./services/solana');
const connectWithRetry = require("./config/database");
const { fetchSupportedTokens } = require('./utils/helpers');
const { PublicKey } = require('@solana/web3.js');

(async () => {
  try {
    await connectWithRetry(); // Wait for the MongoDB connection
    // Function to be run every 60 seconds
    let isEvmRunning = false;
    const runEvmTasks = async () => {
      if (isEvmRunning) {
        console.log("runEvmTasks is already running, skipping this iteration.");
        return;
      }
      isEvmRunning = true;
      try {
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
      } finally {
        isEvmRunning = false;
      }
    };
    // Run the task immediately once
    await runEvmTasks();
    // // Set interval to run the task every 60 seconds
    setInterval(runEvmTasks, 60 * 1000);

    const solanaNetworks = (SOLANA_NETWORKS || 'devnet').split(',');
    const solanaServerAddress = SOLANA_SERVER_ADDRESS;
    const solanaInstances = createSolanaInstances(solanaNetworks);
    let isSolanaRunning = false;

    const runSolanaTasks = async () => {
      if (isSolanaRunning) {
        console.log("runSolanaTasks is already running, skipping this iteration.");
        return;
      }
      isSolanaRunning = true;
      try {
        for (const network of Object.keys(solanaInstances)) {
          const solanaInstance = solanaInstances[network];
          const { supportedTokens, isDocumentUpdated, isNativeTokenPresent } = await fetchSupportedTokens(`sol-${network}`);
          console.log("INITIALIZED");
          try {
            for (const token of supportedTokens) {
              const { address, symbol, decimal, network, isNativeToken } = token;
              if (!isNativeToken) {
                // spl tokens
                const { tokenAccount, programId } = await findAssociatedTokenAddress(solanaInstance, new PublicKey(solanaServerAddress), address);
                await processAllTransactions(solanaInstance, tokenAccount, network, true, symbol);
              } else {
                // sol token
                await processAllTransactions(solanaInstance, solanaServerAddress, network, false, 'sol');
              }
            }
            console.log("END----");
          } catch (error) {
            console.error(`Error subscribing to ${network} mined transactions`, error.message);
          }
        }
      } finally {
        isSolanaRunning = false;
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