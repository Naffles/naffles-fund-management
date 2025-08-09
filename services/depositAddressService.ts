import { ethers } from 'ethers';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import crypto from 'crypto';
import { SUPPORTED_CHAINS, ChainConfig } from '../utils/constants';

/**
 * Interface for deposit address generation result
 */
export interface DepositAddress {
  address: string;
  chainId: string;
  tokenContract?: string;
  isNativeToken: boolean;
  derivationPath?: string;
  publicKey?: string;
}

/**
 * Service for generating deposit addresses across multiple blockchains
 */
export class DepositAddressService {
  private masterSeed: string;
  private chainConfigs: Map<string, ChainConfig>;

  constructor(masterSeed?: string) {
    this.masterSeed = masterSeed || process.env.MASTER_SEED || this.generateMasterSeed();
    this.chainConfigs = new Map();
    this.initializeChainConfigs();
  }

  /**
   * Initialize chain configurations
   */
  private initializeChainConfigs(): void {
    for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
      this.chainConfigs.set(chainId, config);
    }
  }

  /**
   * Generate a master seed for deterministic address generation
   */
  private generateMasterSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate deposit address for a specific user and chain
   */
  async generateDepositAddress(
    userId: string,
    chainId: string,
    tokenContract?: string
  ): Promise<DepositAddress> {
    const chainConfig = this.chainConfigs.get(chainId);
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    switch (chainConfig.type) {
      case 'evm':
        return this.generateEVMAddress(userId, chainId, tokenContract);
      case 'solana':
        return this.generateSolanaAddress(userId, chainId, tokenContract);
      case 'bitcoin':
        return this.generateBitcoinAddress(userId, chainId);
      default:
        throw new Error(`Unsupported chain type: ${chainConfig.type}`);
    }
  }

  /**
   * Generate EVM-compatible address (Ethereum, Polygon, Base, etc.)
   */
  private async generateEVMAddress(
    userId: string,
    chainId: string,
    tokenContract?: string
  ): Promise<DepositAddress> {
    // Create deterministic wallet from user ID and chain
    const seed = this.createDeterministicSeed(userId, chainId);
    const wallet = new ethers.Wallet(seed);

    return {
      address: wallet.address,
      chainId,
      tokenContract,
      isNativeToken: !tokenContract,
      derivationPath: `m/44'/60'/0'/0/${this.getUserIndex(userId)}`,
      publicKey: wallet.publicKey
    };
  }

  /**
   * Generate Solana address
   */
  private async generateSolanaAddress(
    userId: string,
    chainId: string,
    tokenContract?: string
  ): Promise<DepositAddress> {
    // Create deterministic keypair from user ID and chain
    const seed = this.createDeterministicSeed(userId, chainId);
    const keypair = Keypair.fromSeed(Buffer.from(seed.slice(0, 32), 'hex'));

    if (tokenContract) {
      // Generate associated token account address
      const mintPublicKey = new PublicKey(tokenContract);
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        keypair.publicKey
      );

      return {
        address: associatedTokenAddress.toString(),
        chainId,
        tokenContract,
        isNativeToken: false,
        publicKey: keypair.publicKey.toString()
      };
    }

    return {
      address: keypair.publicKey.toString(),
      chainId,
      isNativeToken: true,
      publicKey: keypair.publicKey.toString()
    };
  }

  /**
   * Generate Bitcoin address
   */
  private async generateBitcoinAddress(
    userId: string,
    chainId: string
  ): Promise<DepositAddress> {
    // For Bitcoin, we'll use a simplified approach
    // In production, you'd want to use proper Bitcoin libraries like bitcoinjs-lib
    const seed = this.createDeterministicSeed(userId, chainId);
    const hash = crypto.createHash('sha256').update(seed).digest();
    
    // This is a simplified Bitcoin address generation
    // In production, implement proper P2PKH or P2WPKH address generation
    const address = `bc1q${hash.toString('hex').slice(0, 40)}`;

    return {
      address,
      chainId,
      isNativeToken: true,
      derivationPath: `m/84'/0'/0'/0/${this.getUserIndex(userId)}`
    };
  }

  /**
   * Create deterministic seed from user ID and chain
   */
  private createDeterministicSeed(userId: string, chainId: string): string {
    const combined = `${this.masterSeed}-${userId}-${chainId}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Get user index for derivation path
   */
  private getUserIndex(userId: string): number {
    const hash = crypto.createHash('sha256').update(userId).digest();
    return hash.readUInt32BE(0) % 2147483647; // Max safe integer for derivation
  }

  /**
   * Validate deposit address format
   */
  validateAddress(address: string, chainId: string): boolean {
    const chainConfig = this.chainConfigs.get(chainId);
    if (!chainConfig) {
      return false;
    }

    switch (chainConfig.type) {
      case 'evm':
        return ethers.isAddress(address);
      case 'solana':
        try {
          new PublicKey(address);
          return true;
        } catch {
          return false;
        }
      case 'bitcoin':
        // Simplified Bitcoin address validation
        return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
      default:
        return false;
    }
  }

  /**
   * Get all supported chains
   */
  getSupportedChains(): string[] {
    return Array.from(this.chainConfigs.keys());
  }

  /**
   * Get chain configuration
   */
  getChainConfig(chainId: string): ChainConfig | undefined {
    return this.chainConfigs.get(chainId);
  }
}

export default DepositAddressService;