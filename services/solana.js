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

const handleParsedTransaction = async (connection, txHash, network, parsed, monitoredAddressStr, isSol, symbol) => {
  try {
    let from = parsed.info.source;
    let to = parsed.info.destination;
    const amount = isSol ? parsed.info.lamports : (parsed.info?.tokenAmount?.amount || parsed.info?.amount);

    if (to === monitoredAddressStr) {
      from = isSol ? from : await getOwnerOfTokenAccount(connection, from);
      console.log("Deposit data: ", symbol, from, amount, txHash, network);
      await depositTokens(symbol, from, amount, txHash, network);
    } else if (from === monitoredAddressStr) {
      to = isSol ? to : await getOwnerOfTokenAccount(connection, to);
      console.log("Withdraw data: ", symbol, to, amount, txHash, network);
      await withdrawTokens(symbol, to, amount, txHash, network);
    }
  } catch (error) {
    console.error(`Error handling parsed transaction: ${error.message}`, error);
  }
};

const handleTransaction = async (connection, transaction, monitoredAddress, symbol, network) => {
  try {
    const { message } = transaction.transaction;
    const monitoredAddressStr = monitoredAddress.toBase58();
    const txHash = transaction.transaction.signatures[0];
    const isSol = symbol === 'sol';

    for (const instruction of message.instructions) {
      const programId = instruction.programId.toBase58();
      const { parsed } = instruction;

      if ((isSol && programId === '11111111111111111111111111111111') ||
        (!isSol && programId === TOKEN_PROGRAM_ID.toBase58())) {
        await handleParsedTransaction(connection, txHash, network, parsed, monitoredAddressStr, isSol, symbol);
      }
    }
  } catch (error) {
    console.error(`Error handling transaction: ${error.message}`, error);
  }
};

const processTransaction = async (connection, transaction, monitoredAddress, network, symbol, isNativeTokenPresent, nativeTokenSubscriptionId) => {
  try {
    if (!transaction) return;
    const message = transaction.transaction.message;
    const programIds = message.instructions.map(instruction => (instruction.programId).toBase58());
    const isSolTransaction = programIds.includes('11111111111111111111111111111111');
    const isSplTransaction = programIds.includes(TOKEN_PROGRAM_ID.toBase58());

    if (isSolTransaction) {
      await handleTransaction(connection, transaction, monitoredAddress, symbol, network);
    }

    if (isSplTransaction) {
      if ((isNativeTokenPresent && nativeTokenSubscriptionId !== null) ||
        (!isNativeTokenPresent && nativeTokenSubscriptionId === null)) {
        await handleTransaction(connection, transaction, monitoredAddress, symbol, network);
      }
    }
  } catch (error) {
    console.error(`Error processing transaction: ${error.message}`, error);
  }
};

const subscribeToTransactions = (
  connection,
  address,
  network,
  spl = false,
  symbol,
  isNativeTokenPresent,
  nativeTokenSubscriptionId = null
) => {
  try {
    const publicKey = spl ? address : new PublicKey(address);
    console.log(`Subscribing to transactions for publicKey: ${publicKey.toBase58()}`);
    const subscriptionId = connection.onLogs(publicKey, async (log) => {
      try {
        if (log.err === null) {
          const transaction = await connection.getParsedTransaction(log.signature, { commitment: 'confirmed' });
          await processTransaction(connection, transaction, publicKey, network, symbol, isNativeTokenPresent, nativeTokenSubscriptionId);
        }
      } catch (error) {
        console.error(`Error processing log entry for publicKey ${publicKey.toBase58()}: ${error.message}`, error);
      }
    }, 'confirmed');
    return subscriptionId;
  } catch (error) {
    console.error(`Error subscribing to transactions for address ${address.toString()}: ${error.message}`, error);
  }
};

const findAssociatedTokenAddress = async (walletAddress, tokenMintAddress) => {
  try {
    const associatedTokenAddress = await getAssociatedTokenAddress(
      new PublicKey(tokenMintAddress),
      new PublicKey(walletAddress),
      false, // allowOwnerOffCurve (set to false in most cases)
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return associatedTokenAddress;
  } catch (error) {
    console.error(`Error finding associated token address for wallet ${walletAddress.toString()} and token mint ${tokenMintAddress.toString()}: ${error.message}`, error);
    throw error;
  }
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
