import dotenv from 'dotenv';
import path from 'path';

/**
 * Environment configuration management for Fund Management Service
 */

export type Environment = 'development' | 'staging' | 'production' | 'localhost';

export interface FundServiceConfig {
  environment: Environment;
  database: {
    url: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  blockchain: {
    evmNetworks: string[];
    solanaNetworks: string[];
    evmServerAddresses: string[];
    solanaServerAddress: string;
  };
  alchemy: {
    apiKey: string;
  };
  monitoring: {
    intervalSeconds: number;
    logLevel: string;
  };
}

/**
 * Fund Management Environment Manager
 */
class FundEnvironmentManager {
  private static instance: FundEnvironmentManager;
  private config: FundServiceConfig | null = null;
  private environment: Environment;

  private constructor() {
    this.environment = this.detectEnvironment();
    this.loadEnvironmentFile();
  }

  public static getInstance(): FundEnvironmentManager {
    if (!FundEnvironmentManager.instance) {
      FundEnvironmentManager.instance = new FundEnvironmentManager();
    }
    return FundEnvironmentManager.instance;
  }

  private detectEnvironment(): Environment {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    
    switch (nodeEnv) {
      case 'development':
        return 'development';
      case 'staging':
        return 'staging';
      case 'production':
        return 'production';
      case 'localhost':
        return 'localhost';
      default:
        return 'development';
    }
  }

  private loadEnvironmentFile(): void {
    const envFile = `.env.${this.environment}`;
    const envPath = path.resolve(process.cwd(), envFile);
    
    try {
      dotenv.config({ path: envPath });
      console.log(`Fund Management: Loaded environment configuration from ${envFile}`);
    } catch (error) {
      console.warn(`Fund Management: Could not load ${envFile}, falling back to default .env`);
      dotenv.config();
    }
  }

  private getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Fund Management: Required environment variable ${key} is not set`);
    }
    return value;
  }

  private getOptionalEnv(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  public getConfig(): FundServiceConfig {
    if (this.config) {
      return this.config;
    }

    this.config = {
      environment: this.environment,
      
      database: {
        url: this.getRequiredEnv('MONGO_URL'),
      },

      redis: {
        host: this.getOptionalEnv('REDIS_URL', 'redis'),
        port: parseInt(this.getOptionalEnv('REDIS_PORT', '6379')),
        password: process.env.REDIS_PASSWORD,
        db: parseInt(this.getOptionalEnv('REDIS_DB', '1')),
      },

      blockchain: {
        evmNetworks: this.getOptionalEnv('EVM_NETWORKS', 'sepolia').split(','),
        solanaNetworks: this.getOptionalEnv('SOLANA_NETWORKS', 'devnet').split(','),
        evmServerAddresses: this.getOptionalEnv('EVM_SERVER_ADDRESS', '0x829c609b5EED7A5D53C684B5f8b1d3aa6DE46145').split(','),
        solanaServerAddress: this.getOptionalEnv('SOLANA_SERVER_ADDRESS', ''),
      },

      alchemy: {
        apiKey: this.getOptionalEnv('ALCHEMY_API_KEY', ''),
      },

      monitoring: {
        intervalSeconds: parseInt(this.getOptionalEnv('MONITORING_INTERVAL_SECONDS', '60')),
        logLevel: this.getOptionalEnv('LOG_LEVEL', this.environment === 'development' ? 'debug' : 'info'),
      },
    };

    return this.config;
  }

  public getEnvironment(): Environment {
    return this.environment;
  }

  public isDevelopment(): boolean {
    return this.environment === 'development' || this.environment === 'localhost';
  }

  public isProduction(): boolean {
    return this.environment === 'production';
  }

  public validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getConfig();

    if (!config.database.url) {
      errors.push('Database URL is required');
    }

    if (!config.alchemy.apiKey && this.isProduction()) {
      errors.push('Alchemy API key is required in production');
    }

    if (config.blockchain.evmNetworks.length === 0) {
      errors.push('At least one EVM network must be configured');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const fundEnvironmentManager = FundEnvironmentManager.getInstance();
export default fundEnvironmentManager;