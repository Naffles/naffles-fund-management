import axios from 'axios';
import { EXCHANGE_RATE_APIS } from '../utils/constants';

/**
 * Interface for exchange rate data
 */
export interface ExchangeRate {
  symbol: string;
  usd: number;
  eur: number;
  lastUpdated: Date;
}

/**
 * Interface for token price data from CoinGecko
 */
interface CoinGeckoPrice {
  usd: number;
  eur: number;
  last_updated_at: number;
}

/**
 * Service for fetching and caching exchange rates
 */
export class ExchangeRateService {
  private cache: Map<string, ExchangeRate> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Token symbol to CoinGecko ID mapping
   */
  private readonly TOKEN_ID_MAP: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'SOL': 'solana',
    'MATIC': 'matic-network',
    'BNB': 'binancecoin',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'DAI': 'dai',
    'RON': 'ronin'
  };

  /**
   * Get exchange rate for a token
   */
  async getExchangeRate(tokenSymbol: string): Promise<ExchangeRate | null> {
    try {
      const normalizedSymbol = tokenSymbol.toUpperCase();
      
      // Check cache first
      const cached = this.getCachedRate(normalizedSymbol);
      if (cached) {
        return cached;
      }

      // Fetch from API
      const rate = await this.fetchExchangeRate(normalizedSymbol);
      if (rate) {
        this.setCachedRate(normalizedSymbol, rate);
      }

      return rate;
    } catch (error) {
      console.error(`Error getting exchange rate for ${tokenSymbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple exchange rates
   */
  async getMultipleExchangeRates(tokenSymbols: string[]): Promise<Map<string, ExchangeRate>> {
    const rates = new Map<string, ExchangeRate>();
    
    try {
      // Separate cached and non-cached tokens
      const cachedTokens: string[] = [];
      const nonCachedTokens: string[] = [];

      for (const symbol of tokenSymbols) {
        const normalizedSymbol = symbol.toUpperCase();
        const cached = this.getCachedRate(normalizedSymbol);
        
        if (cached) {
          rates.set(normalizedSymbol, cached);
          cachedTokens.push(normalizedSymbol);
        } else {
          nonCachedTokens.push(normalizedSymbol);
        }
      }

      // Fetch non-cached rates in batch
      if (nonCachedTokens.length > 0) {
        const batchRates = await this.fetchMultipleExchangeRates(nonCachedTokens);
        
        for (const [symbol, rate] of batchRates) {
          rates.set(symbol, rate);
          this.setCachedRate(symbol, rate);
        }
      }

      return rates;
    } catch (error) {
      console.error('Error getting multiple exchange rates:', error);
      return rates;
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(
    amount: number,
    fromToken: string,
    toCurrency: 'usd' | 'eur'
  ): Promise<number | null> {
    try {
      const rate = await this.getExchangeRate(fromToken);
      if (!rate) return null;

      return amount * rate[toCurrency];
    } catch (error) {
      console.error(`Error converting ${amount} ${fromToken} to ${toCurrency}:`, error);
      return null;
    }
  }

  /**
   * Get cached exchange rate
   */
  private getCachedRate(symbol: string): ExchangeRate | null {
    const cached = this.cache.get(symbol);
    const expiry = this.cacheExpiry.get(symbol);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(symbol);
      this.cacheExpiry.delete(symbol);
    }

    return null;
  }

  /**
   * Set cached exchange rate
   */
  private setCachedRate(symbol: string, rate: ExchangeRate): void {
    this.cache.set(symbol, rate);
    this.cacheExpiry.set(symbol, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Fetch exchange rate from CoinGecko API
   */
  private async fetchExchangeRate(tokenSymbol: string): Promise<ExchangeRate | null> {
    try {
      const coinId = this.TOKEN_ID_MAP[tokenSymbol];
      if (!coinId) {
        console.warn(`No CoinGecko ID mapping for token: ${tokenSymbol}`);
        return null;
      }

      const response = await axios.get(
        `${EXCHANGE_RATE_APIS.COINGECKO}/simple/price`,
        {
          params: {
            ids: coinId,
            vs_currencies: 'usd,eur',
            include_last_updated_at: true
          },
          timeout: 10000
        }
      );

      const priceData: CoinGeckoPrice = response.data[coinId];
      if (!priceData) {
        console.warn(`No price data found for ${tokenSymbol} (${coinId})`);
        return null;
      }

      return {
        symbol: tokenSymbol,
        usd: priceData.usd,
        eur: priceData.eur,
        lastUpdated: new Date(priceData.last_updated_at * 1000)
      };
    } catch (error) {
      console.error(`Error fetching exchange rate for ${tokenSymbol}:`, error);
      return null;
    }
  }

  /**
   * Fetch multiple exchange rates in batch
   */
  private async fetchMultipleExchangeRates(tokenSymbols: string[]): Promise<Map<string, ExchangeRate>> {
    const rates = new Map<string, ExchangeRate>();

    try {
      // Map symbols to CoinGecko IDs
      const coinIds: string[] = [];
      const symbolToIdMap: Record<string, string> = {};

      for (const symbol of tokenSymbols) {
        const coinId = this.TOKEN_ID_MAP[symbol];
        if (coinId) {
          coinIds.push(coinId);
          symbolToIdMap[coinId] = symbol;
        }
      }

      if (coinIds.length === 0) {
        return rates;
      }

      const response = await axios.get(
        `${EXCHANGE_RATE_APIS.COINGECKO}/simple/price`,
        {
          params: {
            ids: coinIds.join(','),
            vs_currencies: 'usd,eur',
            include_last_updated_at: true
          },
          timeout: 15000
        }
      );

      // Process response data
      for (const [coinId, priceData] of Object.entries(response.data)) {
        const symbol = symbolToIdMap[coinId];
        if (symbol && priceData) {
          const data = priceData as CoinGeckoPrice;
          rates.set(symbol, {
            symbol,
            usd: data.usd,
            eur: data.eur,
            lastUpdated: new Date(data.last_updated_at * 1000)
          });
        }
      }

      return rates;
    } catch (error) {
      console.error('Error fetching multiple exchange rates:', error);
      return rates;
    }
  }

  /**
   * Get supported tokens for exchange rates
   */
  getSupportedTokens(): string[] {
    return Object.keys(this.TOKEN_ID_MAP);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    console.log('Exchange rate cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; tokens: string[] } {
    return {
      size: this.cache.size,
      tokens: Array.from(this.cache.keys())
    };
  }

  /**
   * Health check for exchange rate service
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; error?: string }> {
    try {
      // Test with a common token
      const testRate = await this.fetchExchangeRate('ETH');
      
      if (testRate && testRate.usd > 0) {
        return { status: 'healthy' };
      } else {
        return { 
          status: 'unhealthy', 
          error: 'Failed to fetch test exchange rate' 
        };
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message 
      };
    }
  }
}

export default ExchangeRateService;