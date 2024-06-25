module.exports = {
  REDIS_URL: process.env.REDIS_URL || "redis",
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  EVM_NETWORKS: 'sepolia', //,polygon,mainnet,sepolia
  SOLANA_NETWORKS: 'devnet',//mainnet', //,testnet,devnet
  EVM_SERVER_ADDRESS: '0x829c609b5EED7A5D53C684B5f8b1d3aa6DE46145',
  SOLANA_SERVER_ADDRESS: 'ANrTqHoU4rkzUxbXW9WsDAs5w2BWMh8MUUMRGsYnca5a',
  SPL_SUPPORTED_TOKENS: [
    { address: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', symbol: 'spl-test-token1', decimal: 6 },
    { address: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', symbol: 'spl-test-token2', decimal: 6 }
  ]
};

// // test address
// EVM_SERVER_ADDRESS: '0x829c609b5EED7A5D53C684B5f8b1d3aa6DE46145',
// SOLANA_SERVER_ADDRESS: 'ANrTqHoU4rkzUxbXW9WsDAs5w2BWMh8MUUMRGsYnca5a'

// // main address
// EVM_SERVER_ADDRESS: '0x0D58Eba3187634EeF81E2E2B63fF132CBaA25AD2',
// SOLANA_SERVER_ADDRESS: 'VaHsRkx789PgGiy3tamsD5whQzDFDXYQ2FAhJHmsH3d'