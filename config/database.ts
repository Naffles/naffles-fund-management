import mongoose from 'mongoose';

interface DatabaseConfig {
  url: string;
  options: mongoose.ConnectOptions;
}

/**
 * Enhanced MongoDB connection utility for Fund Management Service
 */
class FundDatabaseManager {
  private static instance: FundDatabaseManager;
  private isConnected: boolean = false;
  private connectionRetries: number = 0;
  private maxRetries: number = 5;
  private retryDelay: number = 5000;

  private constructor() {}

  public static getInstance(): FundDatabaseManager {
    if (!FundDatabaseManager.instance) {
      FundDatabaseManager.instance = new FundDatabaseManager();
    }
    return FundDatabaseManager.instance;
  }

  /**
   * Get database configuration based on environment
   */
  private getDatabaseConfig(): DatabaseConfig {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
      throw new Error('MONGO_URL environment variable is required');
    }

    return {
      url: mongoUrl,
      options: {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        bufferMaxEntries: 0,
        autoIndex: process.env.NODE_ENV !== 'production',
      }
    };
  }

  /**
   * Connect to MongoDB with retry logic
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log('Fund Management Database already connected');
      return;
    }

    try {
      const config = this.getDatabaseConfig();
      console.log(`Fund Management: Attempting to connect to MongoDB... (Attempt ${this.connectionRetries + 1}/${this.maxRetries})`);

      await mongoose.connect(config.url, config.options);
      
      this.isConnected = true;
      this.connectionRetries = 0;
      
      console.log('Fund Management: Successfully connected to MongoDB');
      
      // Set up connection event listeners
      this.setupEventListeners();

    } catch (error) {
      this.connectionRetries++;
      console.error(`Fund Management: MongoDB connection failed (Attempt ${this.connectionRetries}/${this.maxRetries}):`, error);

      if (this.connectionRetries < this.maxRetries) {
        console.log(`Fund Management: Retrying connection in ${this.retryDelay / 1000} seconds...`);
        setTimeout(() => this.connect(), this.retryDelay);
      } else {
        console.error('Fund Management: Max connection retries reached. Exiting...');
        process.exit(1);
      }
    }
  }

  /**
   * Set up MongoDB connection event listeners
   */
  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      console.log('Fund Management: MongoDB connected successfully');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      console.error('Fund Management: MongoDB connection error:', error);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('Fund Management: MongoDB disconnected');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      console.log('Fund Management: MongoDB connection closed');
    } catch (error) {
      console.error('Fund Management: Error closing MongoDB connection:', error);
    }
  }

  /**
   * Check if database is connected
   */
  public isDbConnected(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): string {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
  }
}

// Legacy function for backward compatibility
const connectWithRetry = (): Promise<void> => {
  const dbManager = FundDatabaseManager.getInstance();
  return dbManager.connect();
};

export { FundDatabaseManager, connectWithRetry };
export default connectWithRetry;