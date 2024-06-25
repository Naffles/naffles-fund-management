const { Connection, PublicKey } = require('@solana/web3.js');
const solanaConfigs = require('../config/solanaConfig');
const { depositTokens, withdrawTokens } = require('../controllers/userController');
const { getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, AccountLayout } = require('@solana/spl-token');

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

const absBigInt = (value) => {
  return value < 0n ? -value : value;
};

const calculateAmount = (preBalance, postBalance) => {
  return absBigInt(BigInt(preBalance) - BigInt(postBalance))
};

const handleTransaction = async (connection, transaction, monitoredAddress, symbol) => {
  const message = transaction.transaction.message;
  const monitoredAddressStr = monitoredAddress.toBase58();
  const txHash = transaction.transaction.signatures[0];
  const isSol = 'sol' === symbol ? true : false;
  message.instructions.forEach(async (instruction) => {
    const keys = instruction.accounts.map(index => message.accountKeys[index].toBase58());
    if (keys.includes(monitoredAddressStr)) {
      // for sol computation indexes
      const monitoredIndex = keys.indexOf(monitoredAddressStr);
      const otherIndex = monitoredIndex === 0 ? 1 : 0;

      const senderIndex = isSol ? 0 : 3;
      const recipientIndex = isSol ? 1 : 2;
      const sender = keys[senderIndex];
      const recipient = keys[recipientIndex];
      const decodedRecipient = isSol ? recipient : await getOwnerOfTokenAccount(connection, recipient);

      // console.log("sender: ", sender)
      // console.log("recipient: ", recipient, decodedRecipient)
      // console.log("monitoredAddress: ", monitoredAddressStr);
      // console.log("keys: ", keys);

      if (sender === monitoredAddressStr || (!isSol && sender == await getOwnerOfTokenAccount(connection, monitoredAddressStr))) {
        const preBalance = isSol ? transaction.meta.preBalances[otherIndex] : transaction.meta.preTokenBalances.find(b => b.owner === decodedRecipient)?.uiTokenAmount.amount;
        const postBalance = isSol ? transaction.meta.postBalances[otherIndex] : transaction.meta.postTokenBalances.find(b => b.owner === decodedRecipient)?.uiTokenAmount.amount;
        if (!postBalance && !preBalance) {
          console.log("withdraw post and pre balances equals to null");
          return;
        }
        const amount = calculateAmount(preBalance, postBalance);
        console.log("withdraw data: ", symbol, decodedRecipient, amount, txHash, 'sol')
        await withdrawTokens(symbol, decodedRecipient, amount, txHash, 'sol');
      }
      else if (recipient === monitoredAddressStr) {
        const preBalance = isSol ? transaction.meta.preBalances[monitoredIndex] : transaction.meta.preTokenBalances.find(b => b.owner === decodedRecipient)?.uiTokenAmount.amount;
        const postBalance = isSol ? transaction.meta.postBalances[monitoredIndex] : transaction.meta.postTokenBalances.find(b => b.owner === decodedRecipient)?.uiTokenAmount.amount;
        if (!postBalance && !preBalance) {
          console.log("deposit post and pre balances equals to null");
          return;
        }
        const amount = calculateAmount(preBalance, postBalance);
        console.log("deposit data: ", symbol, sender, amount, txHash, 'sol')
        await depositTokens(symbol, sender, amount, txHash, 'sol');
      }
    }
  });
};

const processTransaction = async (connection, transaction, monitoredAddress, network, symbol, subscriptionId) => {
  if (!transaction) return;

  const message = transaction.transaction.message;
  const programIds = message.instructions.map(instruction => message.accountKeys[instruction.programIdIndex].toBase58());
  const isSolTransaction = programIds.includes('11111111111111111111111111111111');
  const isSplTransaction = programIds.includes(TOKEN_PROGRAM_ID.toBase58());

  if (isSolTransaction) {
    await handleTransaction(connection, transaction, monitoredAddress, symbol);
  }
  if (isSplTransaction && subscriptionId != 0) {
    await handleTransaction(connection, transaction, monitoredAddress, symbol);
  }
};

const subscribeToTransactions = (
  connection,
  address,
  network,
  spl = false,
  symbol,
) => {
  const publicKey = spl ? address : new PublicKey(address);
  console.log(`Subscribing to transactions for publicKey: ${publicKey.toBase58()}`);
  const subscriptionId = connection.onLogs(publicKey, async (log) => {
    if (log.err === null) {
      const transaction = await connection.getTransaction(log.signature, { commitment: 'confirmed' });
      processTransaction(connection, transaction, publicKey, network, symbol, subscriptionId);
    }
  }, 'confirmed');
  // console.log("subscription id : ", subscriptionId);
  return subscriptionId;
};

const findAssociatedTokenAddress = async (walletAddress, tokenMintAddress) => {
  const associatedTokenAddress = await getAssociatedTokenAddress(
    new PublicKey(tokenMintAddress),
    new PublicKey(walletAddress),
    false, // allowOwnerOffCurve (set to false in most cases)
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return associatedTokenAddress;
};

const getOwnerOfTokenAccount = async (connection, tokenAccountAddress) => {
  try {
    const accountInfo = await connection.getAccountInfo(new PublicKey(tokenAccountAddress));
    if (!accountInfo) {
      throw new Error(`Account ${tokenAccountAddress} not found`);
    }
    const tokenAccountData = AccountLayout.decode(accountInfo.data);
    const ownerAddress = new PublicKey(tokenAccountData.owner).toBase58();
    return ownerAddress;
  } catch (error) {
    console.error('Error fetching or decoding account information:', error);
    throw error;
  }
};

module.exports = {
  createSolanaInstances,
  subscribeToTransactions,
  processTransaction,
  findAssociatedTokenAddress
};
