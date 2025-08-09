import TokenBalance from '../models/tokenBalance';
import ExchangeRateService from './exchangeRateService';
import { SUPPORTED_CHAINS } from '../utils/constants';

/**
 * Interface for formatted balance display
 */
export interface FormattedBalance {
  chainId: string;
  chainName: string;
  tokenSymbol: string;
  tokenContract: string;
  balance: string;
  balanceFormatted: string;
  balanceUSD?: number;
  balanceEUR?: number;
  isNativeToken: boolean;
  lastUpdated: Date;
}

/**
 * Interface for grouped balance display
 */
export interface GroupedBalance {
  tokenSymbol: string;
  totalBalanceUSD: number;
  totalBalanceEUR: number;
  chains: FormattedBalance[];
}

/**
 * Interface for user portfolio summary
 */
export interface PortfolioSummary {
  totalValueUSD: number;
  totalValueEUR: number;
  tokenCount: number;
  chainCount: number;
  lastUpdated: Date;
}

/**
 * Service for formatting and displaying user balances
 */
export class BalanceDisplayService {
  private exchangeRateService: ExchangeRateService;

  constructor() {
    this.exchangeRateService = new ExchangeRateService();
  }

  /**
   * Get formatted balances for a user
   */
  async getUserBalances(userId: string): Promise<FormattedBalance[]> {
    try {
      const balances = await TokenBalance.find({ userId }).sort({
        chainId: 1,
        tokenSymbol: 1
      });

      if (balances.length === 0) {
        return [];
      }

      // Get unique token symbols for exchange rate lookup
      const tokenSymbols = [...new Set(balances.map(b => b.tokenSymbol))];
      const exchangeRates = await this.exchangeRateService.getMultipleExchangeRates(tokenSymbols);

      const formattedBalances: FormattedBalance[] = [];

      for (const balance of balances) {
        const chainConfig = SUPPORTED_CHAINS[balance.chainId];
        const exchangeRate = exchangeRates.get(balance.tokenSymbol.toUpperCase());

        const balanceNum = parseFloat(balance.balance);
        const balanceUSD = exchangeRate ? balanceNum * exchangeRate.usd : undefined;
        const balanceEUR = exchangeRate ? balanceNum * exchangeRate.eur : undefined;

        formattedBalances.push({
          chainId: balance.chainId,
          chainName: chainConfig?.name || balance.chainId,
          tokenSymbol: balance.tokenSymbol,
          tokenContract: balance.tokenContract,
          balance: balance.balance,
          balanceFormatted: this.formatBalance(balanceNum, balance.tokenSymbol),
          balanceUSD,
          balanceEUR,
          isNativeToken: balance.isNativeToken,
          lastUpdated: balance.lastUpdated
        });
      }

      return formattedBalances;
    } catch (error) {
      console.error('Error getting user balances:', error);
      throw error;
    }
  }

  /**
   * Get balances grouped by token (same tokens from different chains together)
   */
  async getGroupedUserBalances(userId: string): Promise<GroupedBalance[]> {
    try {
      const balances = await this.getUserBalances(userId);
      const grouped = new Map<string, GroupedBalance>();

      for (const balance of balances) {
        const key = balance.tokenSymbol;
        
        if (!grouped.has(key)) {
          grouped.set(key, {
            tokenSymbol: balance.tokenSymbol,
            totalBalanceUSD: 0,
            totalBalanceEUR: 0,
            chains: []
          });
        }

        const group = grouped.get(key)!;
        group.chains.push(balance);
        
        if (balance.balanceUSD) {
          group.totalBalanceUSD += balance.balanceUSD;
        }
        if (balance.balanceEUR) {
          group.totalBalanceEUR += balance.balanceEUR;
        }
      }

      // Sort chains within each group and sort groups by total value
      const result = Array.from(grouped.values());
      
      result.forEach(group => {
        group.chains.sort((a, b) => {
          // Sort by chain name, but put native tokens first
          if (a.isNativeToken && !b.isNativeToken) return -1;
          if (!a.isNativeToken && b.isNativeToken) return 1;
          return a.chainName.localeCompare(b.chainName);
        });
      });

      // Sort groups by total USD value (descending)
      result.sort((a, b) => b.totalBalanceUSD - a.totalBalanceUSD);

      return result;
    } catch (error) {
      console.error('Error getting grouped user balances:', error);
      throw error;
    }
  }

  /**
   * Get user portfolio summary
   */
  async getUserPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    try {
      const balances = await this.getUserBalances(userId);
      
      let totalValueUSD = 0;
      let totalValueEUR = 0;
      const uniqueTokens = new Set<string>();
      const uniqueChains = new Set<string>();
      let lastUpdated = new Date(0);

      for (const balance of balances) {
        if (balance.balanceUSD) {
          totalValueUSD += balance.balanceUSD;
        }
        if (balance.balanceEUR) {
          totalValueEUR += balance.balanceEUR;
        }
        
        uniqueTokens.add(balance.tokenSymbol);
        uniqueChains.add(balance.chainId);
        
        if (balance.lastUpdated > lastUpdated) {
          lastUpdated = balance.lastUpdated;
        }
      }

      return {
        totalValueUSD,
        totalValueEUR,
        tokenCount: uniqueTokens.size,
        chainCount: uniqueChains.size,
        lastUpdated
      };
    } catch (error) {
      console.error('Error getting user portfolio summary:', error);
      throw error;
    }
  }

  /**
   * Get balances for a specific chain
   */
  async getUserChainBalances(userId: string, chainId: string): Promise<FormattedBalance[]> {
    try {
      const allBalances = await this.getUserBalances(userId);
      return allBalances.filter(balance => balance.chainId === chainId);
    } catch (error) {
      console.error(`Error getting user balances for chain ${chainId}:`, error);
      throw error;
    }
  }

  /**
   * Get balance for a specific token on a specific chain
   */
  async getUserTokenBalance(
    userId: string, 
    chainId: string, 
    tokenContract: string
  ): Promise<FormattedBalance | null> {
    try {
      const balance = await TokenBalance.findOne({
        userId,
        chainId,
        tokenContract
      });

      if (!balance) {
        return null;
      }

      const chainConfig = SUPPORTED_CHAINS[chainId];
      const exchangeRate = await this.exchangeRateService.getExchangeRate(balance.tokenSymbol);

      const balanceNum = parseFloat(balance.balance);
      const balanceUSD = exchangeRate ? balanceNum * exchangeRate.usd : undefined;
      const balanceEUR = exchangeRate ? balanceNum * exchangeRate.eur : undefined;

      return {
        chainId: balance.chainId,
        chainName: chainConfig?.name || balance.chainId,
        tokenSymbol: balance.tokenSymbol,
        tokenContract: balance.tokenContract,
        balance: balance.balance,
        balanceFormatted: this.formatBalance(balanceNum, balance.tokenSymbol),
        balanceUSD,
        balanceEUR,
        isNativeToken: balance.isNativeToken,
        lastUpdated: balance.lastUpdated
      };
    } catch (error) {
      console.error('Error getting user token balance:', error);
      throw error;
    }
  }

  /**
   * Format balance for display
   */
  private formatBalance(balance: number, tokenSymbol: string): string {
    if (balance === 0) {
      return '0';
    }

    // For very small amounts, show more decimal places
    if (balance < 0.001) {
      return balance.toFixed(8);
    }

    // For small amounts, show 6 decimal places
    if (balance < 1) {
      return balance.toFixed(6);
    }

    // For larger amounts, show fewer decimal places
    if (balance < 1000) {
      return balance.toFixed(4);
    }

    // For very large amounts, use scientific notation or abbreviations
    if (balance >= 1000000) {
      return this.formatLargeNumber(balance);
    }

    return balance.toFixed(2);
  }

  /**
   * Format large numbers with abbreviations
   */
  private formatLargeNumber(num: number): string {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  }

  /**
   * Format USD/EUR values for display
   */
  formatCurrencyValue(value: number, currency: 'USD' | 'EUR'): string {
    const symbol = currency === 'USD' ? '$' : '€';
    
    if (value < 0.01) {
      return `${symbol}0.00`;
    }

    if (value >= 1000000) {
      return `${symbol}${this.formatLargeNumber(value)}`;
    }

    return `${symbol}${value.toFixed(2)}`;
  }

  /**
   * Get supported chains for display
   */
  getSupportedChains(): Array<{ chainId: string; name: string; type: string }> {
    return Object.entries(SUPPORTED_CHAINS).map(([chainId, config]) => ({
      chainId,
      name: config.name,
      type: config.type
    }));
  }

  /**
   * Check if user has any balances
   */
  async hasBalances(userId: string): Promise<boolean> {
    try {
      const count = await TokenBalance.countDocuments({ 
        userId,
        balance: { $ne: '0' }
      });
      return count > 0;
    } catch (error) {
      console.error('Error checking if user has balances:', error);
      return false;
    }
  }

  /**
   * Get balance history (placeholder for future implementation)
   */
  async getBalanceHistory(
    userId: string, 
    chainId?: string, 
    tokenSymbol?: string,
    days: number = 30
  ): Promise<Array<{ date: Date; balance: number; valueUSD?: number }>> {
    // This would require storing historical balance data
    // For now, return empty array as placeholder
    return [];
  }
}

export default BalanceDisplayService;