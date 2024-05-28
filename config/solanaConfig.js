const solanaConfigs = {
  devnet: {
    http: process.env.QUICKNODE_API_KEY_SOLANA_DEVNET_HTTP,
    wss: process.env.QUICKNODE_API_KEY_SOLANA_DEVNET_WSS,
  },
  // mainnet: {
  //   url: networkMap.mainnet,
  // },
  // testnet: {
  //   url: networkMap.testnet,
  // },
  // Add other configurations as needed
};

module.exports = solanaConfigs;
