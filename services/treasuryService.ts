import { ethers } from 'ethers';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { SUPPORTED_CHAINS, TREASURY_ADDRESSES, SUPPORTED_TOKENS } from '../utils/constants';

/**
 * Interface for treasury balance
 */
export interface TreasuryBalance {
  chainId: string;
  tokenSymbol: string;
  tokenContract: string;
  balance: string;
  balanceUSD?: number;
  isNativeToken: boolean;
  lastUpdated: Date;
}

/**
 * Interface for treasury transaction
 */
export interface TreasuryTransaction {
  txHash: string;
  chainId: string;
  type: 'deposit' | 'withdrawal' | 'consolidation';
  tokenSymbol: string;
  amount: string;
  fromAddress?: string;
  toAddress?: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

/**
 * Service for managing treasury wallets and funds
 */
export class TreasuryService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private connections: Map<string, Connection> = new Map();
  private treasuryWallets: Map<string, ethers.Wallet | Keypair> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializeTreasuryWallets();
  }

  /**
   * Initialize blockchain providers
   */
  private initializeProviders(): void {
    for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
      try {
        if (config.type === 'evm') {
          const rpcUrl = this.getRpcUrl(config);
          if (rpcUrl) {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            this.providers.set(chainId, provider);
          }
        } else if (config.type === 'solana') {
          const rpcUrl = this.getRpcUrl(config);
          if (rpcUrl) {
            const connection = new Connection(rpcUrl, 'confirmed');
            this.connections.set(chainId, connection);
          }
        }
      } catch (error) {
        console.error(`Failed to initialize provider for ${chainId}:`, error);
      }
    }
  }

  /**
   * Initialize treasury wallets from environment variables
   */
  private initializeTreasuryWallets(): void {
    for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
      try {
        const privateKey = process.env[`TREASURY_${chainId.toUpperCase()}_PRIVATE_KEY`];
        if (!privateKey) {
          console.warn(`No treasury private key found for ${chainId}`);
          continue;
        }

        if (config.type === 'evm') {
          const wallet = new ethers.Wallet(privateKey);
          this.treasuryWallets.set(chainId, wallet);
          console.log(`Initialized EVM treasury wallet for ${chainId}: ${wallet.address}`);
        } else if (config.type === 'solana') {
          const keypair = Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
          this.treasuryWallets.set(chainId, keypair);
          console.log(`Initialized Solana treasury wallet for ${chainId}: ${keypair.publicKey.toString()}`);
        }
      } catch (error) {
        console.error(`Failed to initialize treasury wallet for ${chainId}:`, error);
      }
    }
  }

  /**
   * Get RPC URL with API key
   */
  private getRpcUrl(config: any): string | null {
    const rpcUrls = config.rpcUrls;
    if (!rpcUrls || rpcUrls.length === 0) return null;

    let rpcUrl = rpcUrls[0];
    
    if (rpcUrl.includes('infura.io') && process.env.INFURA_API_KEY) {
      rpcUrl += process.env.INFURA_API_KEY;
    } else if (rpcUrl.includes('alchemyapi.io') && process.env.ALCHEMY_API_KEY) {
      rpcUrl += process.env.ALCHEMY_API_KEY;
    }

    return rpcUrl;
  }

  /**
   * Get treasury balances for all chains and tokens
   */
  async getAllTreasuryBalances(): Promise<TreasuryBalance[]> {
    const balances: TreasuryBalance[] = [];

    for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
      try {
        const chainBalances = await this.getChainTreasuryBalances(chainId);
        balances.push(...chainBalances);
      } catch (error) {
        console.error(`Error getting treasury balances for ${chainId}:`, error);
      }
    }

    return balances;
  }

  /**
   * Get treasury balances for a specific chain
   */
  async getChainTreasuryBalances(chainId: string): Promise<TreasuryBalance[]> {
    const balances: TreasuryBalance[] = [];
    const config = SUPPORTED_CHAINS[chainId];

    if (!config) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    try {
      if (config.type === 'evm') {
        const evmBalances = await this.getEVMTreasuryBalances(chainId);
        balances.push(...evmBalances);
      } else if (config.type === 'solana') {
        const solanaBalances = await this.getSolanaTreasuryBalances(chainId);
        balances.push(...solanaBalances);
      }
    } catch (error) {
      console.error(`Error getting ${chainId} treasury balances:`, error);
    }

    return balances;
  }

  /**
   * Get EVM treasury balances
   */
  private async getEVMTreasuryBalances(chainId: string): Promise<TreasuryBalance[]> {
    const balances: TreasuryBalance[] = [];
    const provider = this.providers.get(chainId);
    const treasuryAddress = TREASURY_ADDRESSES[chainId];

    if (!provider || !treasuryAddress) {
      console.warn(`Provider or treasury address not available for ${chainId}`);
      return balances;
    }

    try {
      // Get native token balance
      const nativeBalance = await provider.getBalance(treasuryAddress);
      const config = SUPPORTED_CHAINS[chainId];
      
      balances.push({
        chainId,
        tokenSymbol: config.nativeCurrency.symbol,
        tokenContract: 'native',
        balance: ethers.formatEther(nativeBalance),
        isNativeToken: true,
        lastUpdated: new Date()
      });

      // Get ERC20 token balances
      const supportedTokens = SUPPORTED_TOKENS[chainId] || {};
      
      for (const [symbol, tokenInfo] of Object.entries(supportedTokens)) {
        try {
          const tokenContract = new ethers.Contract(
            tokenInfo.address,
            ['function balanceOf(address) view returns (uint256)'],
            provider
          );

          const balance = await tokenContract.balanceOf(treasuryAddress);
          const formattedBalance = ethers.formatUnits(balance, tokenInfo.decimals);

          balances.push({
            chainId,
            tokenSymbol: symbol,
            tokenContract: tokenInfo.address,
            balance: formattedBalance,
            isNativeToken: false,
            lastUpdated: new Date()
          });
        } catch (error) {
          console.error(`Error getting ${symbol} balance on ${chainId}:`, error);
        }
      }
    } catch (error) {
      console.error(`Error getting EVM treasury balances for ${chainId}:`, error);
    }

    return balances;
  }

  /**
   * Get Solana treasury balances
   */
  private async getSolanaTreasuryBalances(chainId: string): Promise<TreasuryBalance[]> {
    const balances: TreasuryBalance[] = [];
    const connection = this.connections.get(chainId);
    const treasuryAddress = TREASURY_ADDRESSES[chainId];

    if (!connection || !treasuryAddress) {
      console.warn(`Connection or treasury address not available for ${chainId}`);
      return balances;
    }

    try {
      const publicKey = new PublicKey(treasuryAddress);

      // Get SOL balance
      const solBalance = await connection.getBalance(publicKey);
      balances.push({
        chainId,
        tokenSymbol: 'SOL',
        tokenContract: 'native',
        balance: (solBalance / 1e9).toString(),
        isNativeToken: true,
        lastUpdated: new Date()
      });

      // Get SPL token balances
      const supportedTokens = SUPPORTED_TOKENS[chainId] || {};
      
      for (const [symbol, tokenInfo] of Object.entries(supportedTokens)) {
        try {
          const mintPubkey = new PublicKey(tokenInfo.address);
          const associatedTokenAddress = await getAssociatedTokenAddress(mintPubkey, publicKey);
          
          const tokenAccount = await getAccount(connection, associatedTokenAddress);
          const balance = Number(tokenAccount.amount) / Math.pow(10, tokenInfo.decimals);

          balances.push({
            chainId,
            tokenSymbol: symbol,
            tokenContract: tokenInfo.address,
            balance: balance.toString(),
            isNativeToken: false,
            lastUpdated: new Date()
          });
        } catch (error) {
          // Token account might not exist, which is normal
          if (!error.message.includes('could not find account')) {
            console.error(`Error getting ${symbol} balance on ${chainId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error getting Solana treasury balances for ${chainId}:`, error);
    }

    return balances;
  }

  /**
   * Get treasury address for a chain
   */
  getTreasuryAddress(chainId: string): string | null {
    return TREASURY_ADDRESSES[chainId] || null;
  }

  /**
   * Get all treasury addresses
   */
  getAllTreasuryAddresses(): Record<string, string> {
    return { ...TREASURY_ADDRESSES };
  }

  /**
   * Validate treasury wallet setup
   */
  async validateTreasurySetup(): Promise<Record<string, { valid: boolean; error?: string }>> {
    const results: Record<string, { valid: boolean; error?: string }> = {};

    for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
      try {
        const treasuryAddress = TREASURY_ADDRESSES[chainId];
        const treasuryWallet = this.treasuryWallets.get(chainId);

        if (!treasuryAddress) {
          results[chainId] = { valid: false, error: 'No treasury address configured' };
          continue;
        }

        if (!treasuryWallet) {
          results[chainId] = { valid: false, error: 'No treasury wallet/keypair configured' };
          continue;
        }

        // Validate address matches wallet
        let walletAddress: string;
        if (config.type === 'evm') {
          walletAddress = (treasuryWallet as ethers.Wallet).address;
        } else if (config.type === 'solana') {
          walletAddress = (treasuryWallet as Keypair).publicKey.toString();
        } else {
          results[chainId] = { valid: false, error: 'Unsupported chain type' };
          continue;
        }

        if (walletAddress.toLowerCase() !== treasuryAddress.toLowerCase()) {
          results[chainId] = { 
            valid: false, 
            error: 'Treasury address does not match wallet address' 
          };
          continue;
        }

        // Test connection
        if (config.type === 'evm') {
          const provider = this.providers.get(chainId);
          if (provider) {
            await provider.getBalance(treasuryAddress);
          }
        } else if (config.type === 'solana') {
          const connection = this.connections.get(chainId);
          if (connection) {
            await connection.getBalance(new PublicKey(treasuryAddress));
          }
        }

        results[chainId] = { valid: true };
      } catch (error) {
        results[chainId] = { valid: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Get treasury health status
   */
  async getTreasuryHealth(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    chains: Record<string, { status: 'healthy' | 'warning' | 'critical'; message?: string }>;
  }> {
    const chains: Record<string, { status: 'healthy' | 'warning' | 'critical'; message?: string }> = {};
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    const validation = await this.validateTreasurySetup();

    for (const [chainId, result] of Object.entries(validation)) {
      if (result.valid) {
        chains[chainId] = { status: 'healthy' };
        healthyCount++;
      } else {
        chains[chainId] = { status: 'critical', message: result.error };
        criticalCount++;
      }
    }

    let overall: 'healthy' | 'warning' | 'critical';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (warningCount > 0) {
      overall = 'warning';
    } else {
      overall = 'healthy';
    }

    return { overall, chains };
  }

  /**
   * Get treasury statistics
   */
  async getTreasuryStats(): Promise<{
    totalChains: number;
    activeChains: number;
    totalTokens: number;
    lastUpdated: Date;
  }> {
    const balances = await this.getAllTreasuryBalances();
    const activeChains = new Set(balances.map(b => b.chainId)).size;

    return {
      totalChains: Object.keys(SUPPORTED_CHAINS).length,
      activeChains,
      totalTokens: balances.length,
      lastUpdated: new Date()
    };
  }
}

export default TreasuryService;