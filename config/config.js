module.exports = {
  REDIS_URL: process.env.REDIS_URL || "redis",
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  EVM_NETWORKS: 'mainnet', //,polygon,mainnet,sepolia
  SOLANA_NETWORKS: 'mainnet',//mainnet', //,testnet,devnet
  EVM_SERVER_ADDRESS: '0x0D58Eba3187634EeF81E2E2B63fF132CBaA25AD2',
  SOLANA_SERVER_ADDRESS: 'VaHsRkx789PgGiy3tamsD5whQzDFDXYQ2FAhJHmsH3d'
};

// // test address
// EVM_SERVER_ADDRESS: '0x829c609b5EED7A5D53C684B5f8b1d3aa6DE46145',
// SOLANA_SERVER_ADDRESS: 'ANrTqHoU4rkzUxbXW9WsDAs5w2BWMh8MUUMRGsYnca5a'