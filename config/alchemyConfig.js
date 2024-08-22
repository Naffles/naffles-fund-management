const { Network } = require("alchemy-sdk");

console.log(`Running in ${process.env.NODE_ENV} mode`);

const alchemyConfigs = {
  mainnet: {
    apiKey: process.env.ALCHEMY_API_KEY_ETH_MAINNET,
    network: Network.ETH_MAINNET,
  },
  sepolia: {
    apiKey: process.env.ALCHEMY_API_KEY_SEPOLIA,
    network: Network.ETH_SEPOLIA,
  },
  base: {
    apiKey: process.env.ALCHEMY_API_KEY_ETH_MAINNET,
    network: Network.BASE_MAINNET,
  },
  "base-sepolia": {
    apiKey: process.env.ALCHEMY_API_KEY_SEPOLIA,
    network: Network.BASE_SEPOLIA,
  }
  // Add other configurations as needed
};

module.exports = alchemyConfigs;
