import { ethers } from 'ethers';
import { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
import WithdrawalRequest, { IWithdrawalRequest } from '../models/withdrawalRequest';
import TokenBalance from '../models/tokenBalance';
import { SUPPORTED_CHAINS, TREASURY_ADDRESSES } from '../utils/constants';

/**
 * Interface for withdrawal processing result
 */
export interface WithdrawalResult {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: string;
  gasFee?: string;
}

/**
 * Service for handling withdrawal requests and processing
 */
export class WithdrawalService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private connections: Map<string, Connection> = new Map();
  private treasuryWallets: Map<string, ethers.Wallet | Keypair> = new Map();

  constructor() {
    this.initializeProviders();
    this.initializeTreasuryWallets();
  }

  /**
   * Initialize blockchain providers
   */
  private initializeProviders(): void {
    for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
      try {
        if (config.type === 'evm') {
          const rpcUrl = this.getRpcUrl(config);
          if (rpcUrl) {
            const provider = new ethers.JsonRpcProvider(rpcUrl);
            this.providers.set(chainId, provider);
          }
        } else if (config.type === 'solana') {
          const rpcUrl = this.getRpcUrl(config);
          if (rpcUrl) {
            const connection = new Connection(rpcUrl, 'confirmed');
            this.connections.set(chainId, connection);
          }
        }
      } catch (error) {
        console.error(`Failed to initialize provider for ${chainId}:`, error);
      }
    }
  }

  /**
   * Initialize treasury wallets
   */
  private initializeTreasuryWallets(): void {
    for (const [chainId, config] of Object.entries(SUPPORTED_CHAINS)) {
      try {
        const privateKey = process.env[`TREASURY_${chainId.toUpperCase()}_PRIVATE_KEY`];
        if (!privateKey) continue;

        if (config.type === 'evm') {
          const wallet = new ethers.Wallet(privateKey);
          this.treasuryWallets.set(chainId, wallet);
        } else if (config.type === 'solana') {
          const keypair = Keypair.fromSecretKey(Buffer.from(privateKey, 'hex'));
          this.treasuryWallets.set(chainId, keypair);
        }
      } catch (error) {
        console.error(`Failed to initialize treasury wallet for ${chainId}:`, error);
      }
    }
  }

  /**
   * Get RPC URL with API key
   */
  private getRpcUrl(config: any): string | null {
    const rpcUrls = config.rpcUrls;
    if (!rpcUrls || rpcUrls.length === 0) return null;

    let rpcUrl = rpcUrls[0];
    
    if (rpcUrl.includes('infura.io') && process.env.INFURA_API_KEY) {
      rpcUrl += process.env.INFURA_API_KEY;
    } else if (rpcUrl.includes('alchemyapi.io') && process.env.ALCHEMY_API_KEY) {
      rpcUrl += process.env.ALCHEMY_API_KEY;
    }

    return rpcUrl;
  }

  /**
   * Create withdrawal request
   */
  async createWithdrawalRequest(
    userId: string,
    chainId: string,
    tokenSymbol: string,
    tokenContract: string,
    amount: string,
    destinationAddress: string
  ): Promise<IWithdrawalRequest> {
    try {
      // Validate user has sufficient balance
      const balance = await TokenBalance.findOne({
        userId,
        chainId,
        tokenContract,
        tokenSymbol
      });

      if (!balance || parseFloat(balance.balance) < parseFloat(amount)) {
        throw new Error('Insufficient balance');
      }

      // Validate destination address
      if (!this.validateAddress(destinationAddress, chainId)) {
        throw new Error('Invalid destination address');
      }

      // Create withdrawal request
      const withdrawalRequest = new WithdrawalRequest({
        userId,
        chainId,
        tokenSymbol,
        tokenContract,
        amount,
        destinationAddress,
        status: 'pending'
      });

      await withdrawalRequest.save();
      console.log(`Created withdrawal request ${withdrawalRequest._id} for user ${userId}`);

      return withdrawalRequest;
    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      throw error;
    }
  }

  /**
   * Approve withdrawal request (admin function)
   */
  async approveWithdrawal(
    requestId: string,
    adminId: string,
    adminNotes?: string
  ): Promise<IWithdrawalRequest> {
    try {
      const request = await WithdrawalRequest.findById(requestId);
      if (!request) {
        throw new Error('Withdrawal request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Withdrawal request is not pending');
      }

      request.status = 'approved';
      request.approvedBy = adminId as any;
      request.approvedAt = new Date();
      request.adminNotes = adminNotes;

      await request.save();
      console.log(`Approved withdrawal request ${requestId} by admin ${adminId}`);

      return request;
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      throw error;
    }
  }

  /**
   * Reject withdrawal request (admin function)
   */
  async rejectWithdrawal(
    requestId: string,
    adminId: string,
    adminNotes: string
  ): Promise<IWithdrawalRequest> {
    try {
      const request = await WithdrawalRequest.findById(requestId);
      if (!request) {
        throw new Error('Withdrawal request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Withdrawal request is not pending');
      }

      request.status = 'rejected';
      request.approvedBy = adminId as any;
      request.approvedAt = new Date();
      request.adminNotes = adminNotes;

      await request.save();
      console.log(`Rejected withdrawal request ${requestId} by admin ${adminId}`);

      return request;
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      throw error;
    }
  }

  /**
   * Process approved withdrawal
   */
  async processWithdrawal(requestId: string): Promise<WithdrawalResult> {
    try {
      const request = await WithdrawalRequest.findById(requestId);
      if (!request) {
        throw new Error('Withdrawal request not found');
      }

      if (request.status !== 'approved') {
        throw new Error('Withdrawal request is not approved');
      }

      // Update status to processing
      request.status = 'processing';
      await request.save();

      const chainConfig = SUPPORTED_CHAINS[request.chainId];
      if (!chainConfig) {
        throw new Error(`Unsupported chain: ${request.chainId}`);
      }

      let result: WithdrawalResult;

      if (chainConfig.type === 'evm') {
        result = await this.processEVMWithdrawal(request);
      } else if (chainConfig.type === 'solana') {
        result = await this.processSolanaWithdrawal(request);
      } else {
        throw new Error(`Unsupported chain type: ${chainConfig.type}`);
      }

      // Update request with result
      if (result.success) {
        request.status = 'completed';
        request.txHash = result.txHash;
        request.gasUsed = result.gasUsed;
        request.gasFee = result.gasFee;
        request.processedAt = new Date();

        // Update user balance
        await this.updateUserBalance(request);
      } else {
        request.status = 'failed';
        request.adminNotes = (request.adminNotes || '') + ` Error: ${result.error}`;
      }

      await request.save();
      return result;
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      
      // Update request status to failed
      try {
        await WithdrawalRequest.findByIdAndUpdate(requestId, {
          status: 'failed',
          adminNotes: `Processing error: ${error.message}`
        });
      } catch (updateError) {
        console.error('Error updating failed withdrawal:', updateError);
      }

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process EVM withdrawal
   */
  private async processEVMWithdrawal(request: IWithdrawalRequest): Promise<WithdrawalResult> {
    try {
      const provider = this.providers.get(request.chainId);
      const treasuryWallet = this.treasuryWallets.get(request.chainId) as ethers.Wallet;

      if (!provider || !treasuryWallet) {
        throw new Error(`Provider or treasury wallet not available for ${request.chainId}`);
      }

      const wallet = treasuryWallet.connect(provider);
      const isNativeToken = request.tokenContract === 'native';

      let tx: ethers.TransactionResponse;

      if (isNativeToken) {
        // Native token transfer
        tx = await wallet.sendTransaction({
          to: request.destinationAddress,
          value: ethers.parseEther(request.amount)
        });
      } else {
        // ERC20 token transfer
        const tokenContract = new ethers.Contract(
          request.tokenContract,
          ['function transfer(address to, uint256 amount) returns (bool)'],
          wallet
        );

        tx = await tokenContract.transfer(
          request.destinationAddress,
          ethers.parseUnits(request.amount, 18) // Assuming 18 decimals
        );
      }

      const receipt = await tx.wait();
      
      return {
        success: true,
        txHash: tx.hash,
        gasUsed: receipt?.gasUsed?.toString(),
        gasFee: (receipt?.gasUsed && receipt?.gasPrice) 
          ? (receipt.gasUsed * receipt.gasPrice).toString() 
          : undefined
      };
    } catch (error) {
      console.error('Error processing EVM withdrawal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process Solana withdrawal
   */
  private async processSolanaWithdrawal(request: IWithdrawalRequest): Promise<WithdrawalResult> {
    try {
      const connection = this.connections.get(request.chainId);
      const treasuryKeypair = this.treasuryWallets.get(request.chainId) as Keypair;

      if (!connection || !treasuryKeypair) {
        throw new Error(`Connection or treasury keypair not available for ${request.chainId}`);
      }

      const destinationPubkey = new PublicKey(request.destinationAddress);
      const isNativeToken = request.tokenContract === 'native';

      let transaction: Transaction;
      let signature: string;

      if (isNativeToken) {
        // SOL transfer
        transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: treasuryKeypair.publicKey,
            toPubkey: destinationPubkey,
            lamports: parseFloat(request.amount) * 1e9 // Convert SOL to lamports
          })
        );

        signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair]);
      } else {
        // SPL token transfer
        const mintPubkey = new PublicKey(request.tokenContract);
        const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, treasuryKeypair.publicKey);
        const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, destinationPubkey);

        transaction = new Transaction().add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            treasuryKeypair.publicKey,
            parseFloat(request.amount) * Math.pow(10, 6) // Assuming 6 decimals for most SPL tokens
          )
        );

        signature = await sendAndConfirmTransaction(connection, transaction, [treasuryKeypair]);
      }

      return {
        success: true,
        txHash: signature
      };
    } catch (error) {
      console.error('Error processing Solana withdrawal:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update user balance after successful withdrawal
   */
  private async updateUserBalance(request: IWithdrawalRequest): Promise<void> {
    try {
      const balance = await TokenBalance.findOne({
        userId: request.userId,
        chainId: request.chainId,
        tokenContract: request.tokenContract,
        tokenSymbol: request.tokenSymbol
      });

      if (balance) {
        const currentBalance = parseFloat(balance.balance);
        const withdrawAmount = parseFloat(request.amount);
        const newBalance = (currentBalance - withdrawAmount).toString();

        balance.balance = newBalance;
        balance.lastUpdated = new Date();
        await balance.save();

        console.log(`Updated balance for user ${request.userId}: ${newBalance} ${request.tokenSymbol}`);
      }
    } catch (error) {
      console.error('Error updating user balance:', error);
    }
  }

  /**
   * Validate address format
   */
  private validateAddress(address: string, chainId: string): boolean {
    const chainConfig = SUPPORTED_CHAINS[chainId];
    if (!chainConfig) return false;

    switch (chainConfig.type) {
      case 'evm':
        return ethers.isAddress(address);
      case 'solana':
        try {
          new PublicKey(address);
          return true;
        } catch {
          return false;
        }
      case 'bitcoin':
        return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address);
      default:
        return false;
    }
  }

  /**
   * Get pending withdrawal requests
   */
  async getPendingWithdrawals(): Promise<IWithdrawalRequest[]> {
    try {
      return await WithdrawalRequest.find({ status: 'pending' })
        .populate('userId', 'username email')
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting pending withdrawals:', error);
      throw error;
    }
  }

  /**
   * Get user withdrawal history
   */
  async getUserWithdrawals(userId: string): Promise<IWithdrawalRequest[]> {
    try {
      return await WithdrawalRequest.find({ userId })
        .sort({ createdAt: -1 });
    } catch (error) {
      console.error('Error getting user withdrawals:', error);
      throw error;
    }
  }
}

export default WithdrawalService;