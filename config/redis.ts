import Redis from 'ioredis';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
}

/**
 * Redis connection manager for Fund Management Service
 */
class FundRedisManager {
  private static instance: FundRedisManager;
  private client: Redis | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): FundRedisManager {
    if (!FundRedisManager.instance) {
      FundRedisManager.instance = new FundRedisManager();
    }
    return FundRedisManager.instance;
  }

  /**
   * Get Redis configuration from environment variables
   */
  private getRedisConfig(): RedisConfig {
    return {
      host: process.env.REDIS_URL || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '1'), // Use different DB for fund management
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };
  }

  /**
   * Initialize Redis connection
   */
  public async initialize(): Promise<void> {
    if (this.isConnected) {
      console.log('Fund Management Redis already connected');
      return;
    }

    try {
      const config = this.getRedisConfig();
      this.client = new Redis(config);

      // Set up event listeners
      this.setupEventListeners();

      // Test connection
      await this.client.ping();

      this.isConnected = true;
      console.log('Fund Management Redis connection established successfully');

    } catch (error) {
      console.error('Fund Management: Failed to initialize Redis connection:', error);
      throw error;
    }
  }

  /**
   * Set up Redis event listeners
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('Fund Management Redis client connected');
    });

    this.client.on('error', (error) => {
      console.error('Fund Management Redis client error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      console.log('Fund Management Redis client connection closed');
      this.isConnected = false;
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await this.disconnect();
    });
  }

  /**
   * Get the Redis client
   */
  public getClient(): Redis {
    if (!this.client) {
      throw new Error('Fund Management Redis client not initialized. Call initialize() first.');
    }
    return this.client;
  }

  /**
   * Cache operations
   */
  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.getClient();
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  public async del(key: string): Promise<number> {
    const client = this.getClient();
    return await client.del(key);
  }

  public async exists(key: string): Promise<number> {
    const client = this.getClient();
    return await client.exists(key);
  }

  /**
   * Hash operations for transaction tracking
   */
  public async hset(key: string, field: string, value: string): Promise<number> {
    const client = this.getClient();
    return await client.hset(key, field, value);
  }

  public async hget(key: string, field: string): Promise<string | null> {
    const client = this.getClient();
    return await client.hget(key, field);
  }

  public async hgetall(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    return await client.hgetall(key);
  }

  /**
   * Set operations for tracking processed transactions
   */
  public async sadd(key: string, member: string): Promise<number> {
    const client = this.getClient();
    return await client.sadd(key, member);
  }

  public async sismember(key: string, member: string): Promise<number> {
    const client = this.getClient();
    return await client.sismember(key, member);
  }

  /**
   * Disconnect Redis connection
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
        this.client = null;
      }
      this.isConnected = false;
      console.log('Fund Management Redis connection closed');
    } catch (error) {
      console.error('Fund Management: Error closing Redis connection:', error);
    }
  }

  /**
   * Check if Redis is connected
   */
  public isRedisConnected(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }
}

export { FundRedisManager };
export default FundRedisManager.getInstance();