const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const solanaConfigs = require('../config/solanaConfig');
const { depositTokens, withdrawTokens } = require('../controllers/userController');

const processTransaction = async (transaction, monitoredAddress, network) => {
  if (!transaction) return;

  const message = transaction.transaction.message;
  const monitoredAddressStr = monitoredAddress.toBase58();

  message.instructions.forEach(async (instruction, instructionIndex) => {
    const programId = message.accountKeys[instruction.programIdIndex].toBase58();
    // Check if the program ID is the native SOL program ID
    if (programId === '11111111111111111111111111111111') {
      const keys = instruction.accounts.map(index => message.accountKeys[index].toBase58());
      if (keys.includes(monitoredAddressStr)) {
        const monitoredIndex = keys.indexOf(monitoredAddressStr);
        const otherIndex = monitoredIndex === 0 ? 1 : 0; // Assuming the other address is the first other one

        const sender = keys[0];  // Typically, the sender is the first key
        const recipient = keys[1];  // Typically, the recipient is the second key
        var amount;
        if (sender === monitoredAddressStr) {
          const preBalance = transaction.meta.preBalances[otherIndex];
          const postBalance = transaction.meta.postBalances[otherIndex];
          amount = Math.abs((preBalance - postBalance));
          const cointType = 'sol'
          const txHash = transaction.transaction.signatures[0];
          await withdrawTokens(
            cointType,
            recipient.toLowerCase(),
            BigInt(amount.toString()),
            txHash,
            network
          );
          console.log(`Withdrawal: ${transaction.transaction.signatures[0]}, Amount: ${amount} SOL`);
        } else if (recipient === monitoredAddressStr) {
          const preBalance = transaction.meta.preBalances[monitoredIndex];
          const postBalance = transaction.meta.postBalances[monitoredIndex];
          amount = Math.abs((preBalance - postBalance)); // / LAMPORTS_PER_SOL);
          console.log(`Deposit: ${transaction.transaction.signatures[0]}, Amount: ${amount} SOL`);
          const txHash = transaction.transaction.signatures[0];
          const cointType = 'sol';
          await depositTokens(
            cointType,
            sender.toLowerCase(),
            BigInt(amount.toString()),
            txHash,
            network
          );
        }
      }
    }
  });
};

const createSolanaInstances = (networks) => {
  const instances = {};
  networks.forEach((network) => {
    if (solanaConfigs[network]) {
      instances[network] = new Connection(
        solanaConfigs[network].http,
        { wsEndpoint: solanaConfigs[network].wss }
      );
    } else {
      console.error(`Solana configuration for network "${network}" not found`);
    }
  });
  return instances;
};

const subscribeToTransactions = (connection, address, network) => {
  const publicKey = new PublicKey(address);
  console.log(`Subscribing to transactions for publicKey: ${publicKey.toBase58()}`);

  const subscriptionId = connection.onLogs(publicKey, async (log) => {
    if (log.err === null) {
      const transaction = await connection.getTransaction(log.signature, { commitment: 'confirmed' });
      processTransaction(transaction, publicKey, network);
    }
  }, 'confirmed');
  return subscriptionId;
};


const subscribeToBalanceChanges = (connection, address, callback) => {
  const publicKey = new PublicKey(address);
  console.log(`Subscribing to balance changes for publicKey: ${publicKey.toBase58()}`);

  const subscriptionId = connection.onAccountChange(publicKey, (accountInfo) => {
    if (accountInfo.lamports !== undefined) {
      callback(accountInfo.lamports / 1e9); // Convert lamports to SOL
    }
  }, 'confirmed'); // Use 'confirmed' commitment

  console.log(`Subscription ID: ${subscriptionId}`);
  return subscriptionId;
};

module.exports = {
  createSolanaInstances,
  subscribeToBalanceChanges,
  subscribeToTransactions,
  processTransaction
};
