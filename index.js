const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Import configuration and utilities
const { fundManagementEnvironmentManager } = require('./config/environment');
const { connectWithRetry } = require('./config/database');
const fundManagementRedisManager = require('./config/redis');

// Import legacy services (keeping existing functionality)
const { EVM_NETWORKS, SOLANA_NETWORKS, EVM_SERVER_ADDRESS, SOLANA_SERVER_ADDRESS } = require('./config/config');
const { createAlchemyInstances, getUserTransfers } = require('./services/alchemy');
const { createSolanaInstances, findAssociatedTokenAddress, processAllTransactions } = require('./services/solana');
const { fetchSupportedTokens } = require('./utils/helpers');
const { PublicKey } = require('@solana/web3.js');

// Import new TypeScript services
const DepositMonitoringService = require('./services/depositMonitoringService').default;

const app = express();

/**
 * Initialize Fund Management Service
 */
async function initializeFundManagementService() {
  try {
    console.log('Initializing Fund Management Service...');
    
    // Validate configuration
    const configValidation = fundManagementEnvironmentManager.validateConfig();
    if (!configValidation.isValid) {
      console.error('Configuration validation failed:', configValidation.errors);
      process.exit(1);
    }

    const config = fundManagementEnvironmentManager.getConfig();
    console.log(`Starting Fund Management Service in ${config.environment} mode`);

    // Initialize database connection
    await connectWithRetry();
    console.log('Database connection established');

    // Initialize Redis connection
    await fundManagementRedisManager.initialize();
    console.log('Redis connection established');

    // Configure Express middleware
    app.use(helmet());
    app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }));
    app.use(mongoSanitize());
    app.use(express.json());

    // Import and use routes
    const fundManagementRoutes = require('./routes/fundManagementRoutes').default;
    app.use('/api/fund-management', fundManagementRoutes);

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'fund-management-service',
        environment: config.environment,
        timestamp: new Date().toISOString(),
        database: 'connected',
        redis: fundManagementRedisManager.isRedisConnected() ? 'connected' : 'disconnected'
      });
    });

    // Basic info endpoint
    app.get('/', (req, res) => {
      res.json({
        service: 'Naffles Fund Management Service',
        version: '1.0.0',
        environment: config.environment
      });
    });

    // Initialize new deposit monitoring service
    const depositMonitoringService = new DepositMonitoringService();
    await depositMonitoringService.startMonitoring();
    console.log('New deposit monitoring service started');

    // Legacy monitoring (keeping existing functionality)
    await initializeLegacyMonitoring();

    // Start server
    const server = app.listen(config.server.port, config.server.host, () => {
      console.log(`Fund Management Service listening on ${config.server.host}:${config.server.port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      depositMonitoringService.stopMonitoring();
      server.close(async () => {
        await fundManagementRedisManager.disconnect();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      depositMonitoringService.stopMonitoring();
      server.close(async () => {
        await fundManagementRedisManager.disconnect();
        process.exit(0);
      });
    });

    console.log('Fund Management Service initialized successfully');

  } catch (error) {
    console.error('Failed to initialize Fund Management Service:', error);
    process.exit(1);
  }
}

/**
 * Initialize legacy monitoring (keeping existing functionality)
 */
async function initializeLegacyMonitoring() {
  try {
    // Legacy EVM monitoring
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
    // Set interval to run the task every 60 seconds
    setInterval(runEvmTasks, 60 * 1000);

    // Legacy Solana monitoring
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
          const { supportedTokens } = await fetchSupportedTokens(`sol-${network}`);
          console.log("INITIALIZED");
          try {
            for (const token of supportedTokens) {
              const { address, symbol, isNativeToken } = token;
              if (!isNativeToken) {
                // spl tokens
                const { tokenAccount } = await findAssociatedTokenAddress(solanaInstance, new PublicKey(solanaServerAddress), address);
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
    // Set interval to check for updates and re-run the task if needed 61 seconds
    setInterval(runSolanaTasks, 61 * 1000);

    console.log('Legacy monitoring initialized');
  } catch (error) {
    console.error('Error initializing legacy monitoring:', error);
  }
}

// Start the service
initializeFundManagementService();