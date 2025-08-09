/**
 * Chain configuration interface
 */
export interface ChainConfig {
  name: string;
  type: 'evm' | 'solana' | 'bitcoin';
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  chainId: number | string;
  testnet?: boolean;
}

/**
 * Supported blockchain networks configuration
 */
export const SUPPORTED_CHAINS: Record<string, ChainConfig> = {
  // Ethereum Mainnet
  'ethereum': {
    name: 'Ethereum Mainnet',
    type: 'evm',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.infura.io/v3/', 'https://eth-mainnet.alchemyapi.io/v2/'],
    blockExplorerUrls: ['https://etherscan.io'],
    chainId: 1
  },

  // Ethereum Sepolia Testnet
  'sepolia': {
    name: 'Sepolia Testnet',
    type: 'evm',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://sepolia.infura.io/v3/', 'https://eth-sepolia.alchemyapi.io/v2/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    chainId: 11155111,
    testnet: true
  },

  // Polygon Mainnet
  'polygon': {
    name: 'Polygon Mainnet',
    type: 'evm',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    },
    rpcUrls: ['https://polygon-rpc.com/', 'https://polygon-mainnet.alchemyapi.io/v2/'],
    blockExplorerUrls: ['https://polygonscan.com'],
    chainId: 137
  },

  // Base Mainnet
  'base': {
    name: 'Base Mainnet',
    type: 'evm',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
    chainId: 8453
  },

  // zkSync Era
  'zksync': {
    name: 'zkSync Era',
    type: 'evm',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    rpcUrls: ['https://mainnet.era.zksync.io'],
    blockExplorerUrls: ['https://explorer.zksync.io'],
    chainId: 324
  },

  // Binance Smart Chain
  'bsc': {
    name: 'BNB Smart Chain',
    type: 'evm',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'BNB',
      decimals: 18
    },
    rpcUrls: ['https://bsc-dataseed.binance.org/'],
    blockExplorerUrls: ['https://bscscan.com'],
    chainId: 56
  },

  // Ronin Network
  'ronin': {
    name: 'Ronin Network',
    type: 'evm',
    nativeCurrency: {
      name: 'RON',
      symbol: 'RON',
      decimals: 18
    },
    rpcUrls: ['https://api.roninchain.com/rpc'],
    blockExplorerUrls: ['https://explorer.roninchain.com'],
    chainId: 2020
  },

  // Solana Mainnet
  'solana': {
    name: 'Solana Mainnet',
    type: 'solana',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9
    },
    rpcUrls: ['https://api.mainnet-beta.solana.com'],
    blockExplorerUrls: ['https://explorer.solana.com'],
    chainId: 'mainnet-beta'
  },

  // Solana Devnet
  'solana-devnet': {
    name: 'Solana Devnet',
    type: 'solana',
    nativeCurrency: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9
    },
    rpcUrls: ['https://api.devnet.solana.com'],
    blockExplorerUrls: ['https://explorer.solana.com/?cluster=devnet'],
    chainId: 'devnet',
    testnet: true
  },

  // Bitcoin Mainnet
  'bitcoin': {
    name: 'Bitcoin Mainnet',
    type: 'bitcoin',
    nativeCurrency: {
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8
    },
    rpcUrls: ['https://blockstream.info/api'],
    blockExplorerUrls: ['https://blockstream.info'],
    chainId: 'bitcoin'
  },

  // Bitcoin Testnet
  'bitcoin-testnet': {
    name: 'Bitcoin Testnet',
    type: 'bitcoin',
    nativeCurrency: {
      name: 'Bitcoin Testnet',
      symbol: 'tBTC',
      decimals: 8
    },
    rpcUrls: ['https://blockstream.info/testnet/api'],
    blockExplorerUrls: ['https://blockstream.info/testnet'],
    chainId: 'bitcoin-testnet',
    testnet: true
  }
};

/**
 * Token contract addresses for supported chains
 */
export const SUPPORTED_TOKENS: Record<string, Record<string, any>> = {
  ethereum: {
    USDC: {
      address: '0xA0b86a33E6441b8435b662303c0f479c7e2f9f4e',
      decimals: 6,
      symbol: 'USDC'
    },
    USDT: {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      symbol: 'USDT'
    },
    DAI: {
      address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      decimals: 18,
      symbol: 'DAI'
    }
  },
  polygon: {
    USDC: {
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      decimals: 6,
      symbol: 'USDC'
    },
    USDT: {
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      decimals: 6,
      symbol: 'USDT'
    }
  },
  base: {
    USDC: {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      symbol: 'USDC'
    }
  },
  solana: {
    USDC: {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      decimals: 6,
      symbol: 'USDC'
    },
    USDT: {
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      decimals: 6,
      symbol: 'USDT'
    }
  }
};

/**
 * Exchange rate API endpoints
 */
export const EXCHANGE_RATE_APIS = {
  COINGECKO: 'https://api.coingecko.com/api/v3',
  COINMARKETCAP: 'https://pro-api.coinmarketcap.com/v1'
};

/**
 * Default gas limits for different operations
 */
export const GAS_LIMITS = {
  ETH_TRANSFER: 21000,
  ERC20_TRANSFER: 65000,
  CONTRACT_INTERACTION: 200000
};

/**
 * Minimum confirmation requirements per chain
 */
export const CONFIRMATION_REQUIREMENTS: Record<string, number> = {
  ethereum: 12,
  sepolia: 3,
  polygon: 20,
  base: 10,
  zksync: 10,
  bsc: 15,
  ronin: 10,
  solana: 32,
  'solana-devnet': 1,
  bitcoin: 6,
  'bitcoin-testnet': 1
};

/**
 * Treasury wallet addresses per chain (single wallet per chain for all deposits)
 * These should be loaded from environment variables
 */
export const TREASURY_ADDRESSES: Record<string, string> = {
  ethereum: process.env.TREASURY_ETH_ADDRESS || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  sepolia: process.env.TREASURY_SEPOLIA_ADDRESS || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  polygon: process.env.TREASURY_POLYGON_ADDRESS || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  base: process.env.TREASURY_BASE_ADDRESS || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  zksync: process.env.TREASURY_ZKSYNC_ADDRESS || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  bsc: process.env.TREASURY_BSC_ADDRESS || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  ronin: process.env.TREASURY_RONIN_ADDRESS || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  solana: process.env.TREASURY_SOLANA_ADDRESS || 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
  'solana-devnet': process.env.TREASURY_SOLANA_DEVNET_ADDRESS || 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy',
  bitcoin: process.env.TREASURY_BITCOIN_ADDRESS || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  'bitcoin-testnet': process.env.TREASURY_BITCOIN_TESTNET_ADDRESS || 'tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
};

export default {
  SUPPORTED_CHAINS,
  SUPPORTED_TOKENS,
  EXCHANGE_RATE_APIS,
  GAS_LIMITS,
  CONFIRMATION_REQUIREMENTS,
  TREASURY_ADDRESSES
};