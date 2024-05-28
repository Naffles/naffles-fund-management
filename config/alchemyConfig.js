const { Network } = require("alchemy-sdk");

console.log(`Running in ${process.env.NODE_ENV} mode`);

// Map the environment variable to the corresponding Network enum value
const networkMap = {
  ETH_MAINNET: Network.ETH_MAINNET,
  ETH_SEPOLIA: Network.ETH_SEPOLIA,
  // POLYGON_MAINNET: Network.MATIC_MAINNET,
  // Add other networks as needed
};

const alchemyConfigs = {
  mainnet: {
    apiKey: process.env.ALCHEMY_API_KEY_ETH_MAINNET,
    network: networkMap[process.env.ALCHEMY_NETWORK_ETH_MAINNET] || Network.ETH_MAINNET,
  },
  sepolia: {
    apiKey: process.env.ALCHEMY_API_KEY_SEPOLIA,
    network: networkMap[process.env.ALCHEMY_NETWORK_SEPOLIA] || Network.ETH_SEPOLIA,
  },
  // polygon: {
  //   apiKey: process.env.ALCHEMY_API_KEY_POLYGON,
  //   network: networkMap[process.env.ALCHEMY_NETWORK_POLYGON] || Network.MATIC_MAINNET,
  // },
  // Add other configurations as needed
};

module.exports = alchemyConfigs;
