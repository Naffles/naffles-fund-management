import { ethers } from 'ethers';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import DepositAddressService from './depositAddressService';
import DepositMonitoringService from './depositMonitoringService';
import TokenBalance from '../models/tokenBalance';
import PendingDeposit from '../models/pendingDeposit';
import UnassociatedDeposit from '../models/unassociatedDeposit';
import { TREASURY_ADDRESSES, SUPPORTED_CHAINS } from '../utils/constants';

/**
 * Interface for deposit transaction request
 */
export interface DepositTransactionRequest {
  userId: string;
  chainId: string;
  tokenContract: string;
  amount: string;
  userWalletAddress: string;
}

/**
 * Interface for deposit transaction response
 */
export interface DepositTransactionResponse {
  success: boolean;
  transactionData?: any;
  depositAddress?: string;
  error?: string;
  txHash?: string;
}

/**
 * Service that handles both platform-initiated and direct deposit workflows
 */
export class DepositWorkflowService {
  private depositAddressService: DepositAddressService;
  private depositMonitoringService: DepositMonitoringService;
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private connections: Map<string, Connection> = new Map();

  constructor() {
    this.depositAddressService = new DepositAddressService();
    this.depositMonitoringService = new DepositMonitoringService();
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize blockchain providers for transaction creation
    // Implementation similar to other services...
  }

  /**
   * WORKFLOW 1: Platform-Initiated Deposit (Single Treasury Wallet)
   * User clicks deposit → System creates transaction to treasury → User signs → System monitors confirmation
   */
  async createDepositTransaction(request: DepositTransactionRequest): Promise<DepositTransactionResponse> {
    try {
      console.log(`Creating deposit transaction for user ${request.userId}`);

      // 1. Get treasury wallet address for this chain
      const treasuryAddress = TREASURY_ADDRESSES[request.chainId];
      if (!treasuryAddress) {
        throw new Error(`No treasury address configured for chain ${request.chainId}`);
      }

      // 2. Create pending deposit record
      const pendingDeposit = new PendingDeposit({
        userId: request.userId,
        chainId: request.chainId,
        tokenSymbol: this.getTokenSymbol(request.tokenContract, request.chainId),
        tokenContract: request.tokenContract,
        amount: request.amount,
        treasuryAddress,
        userWalletAddress: request.userWalletAddress,
        status: 'initiated',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      });

      await pendingDeposit.save();

      // 3. Create transaction data for user to sign
      const transactionData = await this.createTransactionForSigning(
        request,
        treasuryAddress
      );

      // 4. Return transaction for user approval
      return {
        success: true,
        transactionData,
        depositAddress: treasuryAddress,
        pendingDepositId: pendingDeposit._id.toString()
      };

    } catch (error) {
      console.error('Error creating deposit transaction:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create transaction data for user to sign in their wallet
   */
  private async createTransactionForSigning(
    request: DepositTransactionRequest,
    depositAddress: string
  ): Promise<any> {
    const chainConfig = this.getChainConfig(request.chainId);
    
    if (chainConfig.type === 'evm') {
      return this.createEVMTransaction(request, depositAddress);
    } else if (chainConfig.type === 'solana') {
      return this.createSolanaTransaction(request, depositAddress);
    }
    
    throw new Error(`Unsupported chain type: ${chainConfig.type}`);
  }

  /**
   * Create EVM transaction for user signing
   */
  private async createEVMTransaction(
    request: DepositTransactionRequest,
    depositAddress: string
  ): Promise<any> {
    const isNativeToken = request.tokenContract === 'native';

    if (isNativeToken) {
      // Native token transfer (ETH, MATIC, etc.)
      return {
        to: depositAddress,
        value: ethers.parseEther(request.amount),
        from: request.userWalletAddress,
        chainId: this.getChainId(request.chainId)
      };
    } else {
      // ERC20 token transfer
      const tokenContract = new ethers.Interface([
        'function transfer(address to, uint256 amount) returns (bool)'
      ]);

      return {
        to: request.tokenContract,
        data: tokenContract.encodeFunctionData('transfer', [
          depositAddress,
          ethers.parseUnits(request.amount, 18)
        ]),
        from: request.userWalletAddress,
        chainId: this.getChainId(request.chainId)
      };
    }
  }

  /**
   * Create Solana transaction for user signing
   */
  private async createSolanaTransaction(
    request: DepositTransactionRequest,
    depositAddress: string
  ): Promise<any> {
    const connection = this.connections.get(request.chainId);
    if (!connection) throw new Error('Solana connection not available');

    const fromPubkey = new PublicKey(request.userWalletAddress);
    const toPubkey = new PublicKey(depositAddress);

    if (request.tokenContract === 'native') {
      // SOL transfer
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports: parseFloat(request.amount) * 1e9
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      return {
        transaction: transaction.serialize({ requireAllSignatures: false }),
        message: 'Sign this transaction to deposit SOL'
      };
    } else {
      // SPL token transfer - would need more complex logic
      throw new Error('SPL token deposits not yet implemented');
    }
  }

  /**
   * WORKFLOW 2: Monitor Transaction Confirmation
   * After user signs transaction, monitor for blockchain confirmation
   */
  async monitorTransactionConfirmation(
    txHash: string,
    pendingDepositId: string
  ): Promise<void> {
    try {
      console.log(`Monitoring transaction ${txHash} for pending deposit ${pendingDepositId}`);

      // Get pending deposit record
      const pendingDeposit = await PendingDeposit.findById(pendingDepositId);
      if (!pendingDeposit) {
        throw new Error('Pending deposit not found');
      }

      // Update with actual transaction hash
      pendingDeposit.actualTxHash = txHash;
      pendingDeposit.status = 'signed';
      pendingDeposit.signedAt = new Date();
      await pendingDeposit.save();

      // Start monitoring this specific transaction
      const chainConfig = SUPPORTED_CHAINS[pendingDeposit.chainId];
      
      if (chainConfig.type === 'evm') {
        await this.monitorEVMTransaction(txHash, pendingDeposit);
      } else if (chainConfig.type === 'solana') {
        await this.monitorSolanaTransaction(txHash, pendingDeposit);
      }

    } catch (error) {
      console.error('Error monitoring transaction confirmation:', error);
    }
  }

  /**
   * Monitor EVM transaction confirmation
   */
  private async monitorEVMTransaction(
    txHash: string,
    pendingDeposit: any
  ): Promise<void> {
    const provider = this.providers.get(pendingDeposit.chainId);
    if (!provider) throw new Error('Provider not available');

    const checkConfirmation = async () => {
      try {
        const receipt = await provider.getTransactionReceipt(txHash);
        
        if (receipt && receipt.status === 1) {
          // Transaction confirmed successfully
          console.log(`Transaction ${txHash} confirmed`);
          
          // Verify transaction details match pending deposit
          const isValid = await this.verifyTransactionDetails(receipt, pendingDeposit);
          
          if (isValid) {
            // Update user balance and mark deposit as confirmed
            await this.confirmPendingDeposit(pendingDeposit, txHash);
          } else {
            // Transaction doesn't match - mark as failed
            await this.failPendingDeposit(pendingDeposit, 'Transaction details do not match expected values');
          }
          
          return true; // Stop monitoring
        }
        
        return false; // Continue monitoring
      } catch (error) {
        console.error('Error checking transaction confirmation:', error);
        return false;
      }
    };

    // Poll every 15 seconds for confirmation
    const interval = setInterval(async () => {
      const confirmed = await checkConfirmation();
      if (confirmed) {
        clearInterval(interval);
      }
    }, 15000);

    // Stop monitoring after 30 minutes
    setTimeout(async () => {
      clearInterval(interval);
      console.log(`Stopped monitoring transaction ${txHash} after timeout`);
      
      // Mark as failed due to timeout
      const currentDeposit = await PendingDeposit.findById(pendingDeposit._id);
      if (currentDeposit && currentDeposit.status === 'signed') {
        await this.failPendingDeposit(currentDeposit, 'Transaction confirmation timeout');
      }
    }, 30 * 60 * 1000);
  }

  /**
   * Monitor Solana transaction confirmation
   */
  private async monitorSolanaTransaction(
    txHash: string,
    userId: string,
    chainId: string,
    expectedAmount: string,
    tokenContract: string
  ): Promise<void> {
    const connection = this.connections.get(chainId);
    if (!connection) throw new Error('Connection not available');

    try {
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(txHash, 'confirmed');
      
      if (!confirmation.value.err) {
        console.log(`Solana transaction ${txHash} confirmed`);
        
        // Update user balance
        await this.updateUserBalanceFromTransaction(
          userId,
          chainId,
          tokenContract,
          expectedAmount,
          txHash
        );
      }
    } catch (error) {
      console.error('Error confirming Solana transaction:', error);
    }
  }

  /**
   * Update user balance after confirmed transaction
   */
  private async updateUserBalanceFromTransaction(
    userId: string,
    chainId: string,
    tokenContract: string,
    amount: string,
    txHash: string
  ): Promise<void> {
    try {
      // Get current balance
      const currentBalance = await TokenBalance.findOne({
        userId,
        chainId,
        tokenContract
      });

      const currentAmount = currentBalance ? parseFloat(currentBalance.balance) : 0;
      const depositAmount = parseFloat(amount);
      const newBalance = (currentAmount + depositAmount).toString();

      // Update balance
      await TokenBalance.findOneAndUpdate(
        { userId, chainId, tokenContract },
        {
          balance: newBalance,
          lastUpdated: new Date(),
          // Store transaction hash for reference
          lastTransactionHash: txHash
        },
        { upsert: true, new: true }
      );

      console.log(`Updated balance for user ${userId}: +${amount} (new total: ${newBalance})`);

      // Emit real-time update to user (WebSocket/Socket.IO)
      this.emitBalanceUpdate(userId, chainId, tokenContract, newBalance);

    } catch (error) {
      console.error('Error updating user balance:', error);
    }
  }

  /**
   * WORKFLOW 3: Handle Direct Transfers (Fallback)
   * For users who send funds directly to deposit addresses
   */
  async handleDirectTransfer(
    depositAddress: string,
    chainId: string,
    amount: string,
    tokenContract: string,
    txHash: string
  ): Promise<void> {
    try {
      // Find user by deposit address
      const userId = await this.getUserByDepositAddress(depositAddress, chainId);
      
      if (userId) {
        console.log(`Direct transfer detected for user ${userId}: ${amount}`);
        
        await this.updateUserBalanceFromTransaction(
          userId,
          chainId,
          tokenContract,
          amount,
          txHash
        );
      } else {
        console.warn(`No user found for deposit address ${depositAddress}`);
      }
    } catch (error) {
      console.error('Error handling direct transfer:', error);
    }
  }

  /**
   * Get user by deposit address
   */
  private async getUserByDepositAddress(address: string, chainId: string): Promise<string | null> {
    // This would query your user-deposit-address mapping
    // Implementation depends on how you store the mapping
    return null; // Placeholder
  }

  /**
   * Emit real-time balance update to user
   */
  private emitBalanceUpdate(userId: string, chainId: string, tokenContract: string, newBalance: string): void {
    // Emit to WebSocket/Socket.IO for real-time UI updates
    // Implementation depends on your real-time system
    console.log(`Emitting balance update for user ${userId}`);
  }

  /**
   * Get chain configuration
   */
  private getChainConfig(chainId: string): any {
    // Return chain configuration
    return { type: 'evm' }; // Placeholder
  }

  /**
   * Get numeric chain ID for EVM chains
   */
  private getChainId(chainId: string): number {
    const chainIds: Record<string, number> = {
      'ethereum': 1,
      'polygon': 137,
      'base': 8453,
      // ... other chains
    };
    return chainIds[chainId] || 1;
  }
}

export default DepositWorkflowService;
  /
**
   * Verify transaction details match pending deposit
   */
  private async verifyTransactionDetails(receipt: any, pendingDeposit: any): Promise<boolean> {
    try {
      // Verify transaction went to correct treasury address
      if (receipt.to.toLowerCase() !== pendingDeposit.treasuryAddress.toLowerCase()) {
        console.warn(`Transaction ${receipt.transactionHash} went to wrong address`);
        return false;
      }

      // For native tokens, verify amount
      if (pendingDeposit.tokenContract === 'native') {
        const transaction = await this.providers.get(pendingDeposit.chainId)?.getTransaction(receipt.transactionHash);
        if (transaction) {
          const expectedAmount = ethers.parseEther(pendingDeposit.amount);
          if (transaction.value !== expectedAmount) {
            console.warn(`Transaction ${receipt.transactionHash} has wrong amount`);
            return false;
          }
        }
      }

      // Additional verification for ERC20 tokens would go here

      return true;
    } catch (error) {
      console.error('Error verifying transaction details:', error);
      return false;
    }
  }

  /**
   * Confirm pending deposit and update user balance
   */
  private async confirmPendingDeposit(pendingDeposit: any, txHash: string): Promise<void> {
    try {
      // Update pending deposit status
      pendingDeposit.status = 'confirmed';
      pendingDeposit.confirmedAt = new Date();
      await pendingDeposit.save();

      // Update user balance
      await this.updateUserBalanceFromTransaction(
        pendingDeposit.userId.toString(),
        pendingDeposit.chainId,
        pendingDeposit.tokenContract,
        pendingDeposit.amount,
        txHash
      );

      console.log(`Confirmed deposit for user ${pendingDeposit.userId}: ${pendingDeposit.amount} ${pendingDeposit.tokenSymbol}`);

    } catch (error) {
      console.error('Error confirming pending deposit:', error);
    }
  }

  /**
   * Mark pending deposit as failed
   */
  private async failPendingDeposit(pendingDeposit: any, reason: string): Promise<void> {
    try {
      pendingDeposit.status = 'failed';
      pendingDeposit.failureReason = reason;
      await pendingDeposit.save();

      console.log(`Failed deposit for user ${pendingDeposit.userId}: ${reason}`);

    } catch (error) {
      console.error('Error failing pending deposit:', error);
    }
  }

  /**
   * Get token symbol from contract address
   */
  private getTokenSymbol(tokenContract: string, chainId: string): string {
    if (tokenContract === 'native') {
      const chainConfig = SUPPORTED_CHAINS[chainId];
      return chainConfig?.nativeCurrency?.symbol || 'UNKNOWN';
    }

    // Look up token symbol from supported tokens
    // This would need to be implemented based on your token configuration
    return 'TOKEN';
  }

  /**
   * WORKFLOW 3: Handle Direct Transfers (Log Only - No Credit)
   * For transactions sent directly to treasury that weren't initiated through UI
   */
  async handleDirectTransfer(
    txHash: string,
    fromAddress: string,
    toAddress: string,
    amount: string,
    tokenContract: string,
    tokenSymbol: string,
    chainId: string,
    blockNumber: number,
    timestamp: Date
  ): Promise<void> {
    try {
      console.log(`Direct transfer detected: ${amount} ${tokenSymbol} from ${fromAddress}`);

      // Check if this was an expected deposit
      const pendingDeposit = await PendingDeposit.findOne({
        actualTxHash: txHash,
        status: { $in: ['signed', 'initiated'] }
      });

      if (pendingDeposit) {
        // This is an expected deposit - handle normally
        console.log(`Direct transfer ${txHash} matches pending deposit ${pendingDeposit._id}`);
        return;
      }

      // This is an unassociated deposit - log it
      const unassociatedDeposit = new UnassociatedDeposit({
        txHash,
        fromAddress,
        toAddress,
        amount,
        tokenSymbol,
        tokenContract,
        chainId,
        blockNumber,
        timestamp,
        status: 'detected'
      });

      await unassociatedDeposit.save();

      console.log(`Logged unassociated deposit: ${txHash}`);

      // Notify admin (optional)
      await this.notifyAdminOfUnassociatedDeposit(unassociatedDeposit);

    } catch (error) {
      console.error('Error handling direct transfer:', error);
    }
  }

  /**
   * Get all unassociated deposits for admin dashboard
   */
  async getUnassociatedDeposits(
    status?: string,
    chainId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ deposits: any[]; total: number }> {
    try {
      const query: any = {};
      
      if (status) query.status = status;
      if (chainId) query.chainId = chainId;

      const [deposits, total] = await Promise.all([
        UnassociatedDeposit.find(query)
          .sort({ detectedAt: -1 })
          .limit(limit)
          .skip(offset)
          .lean(),
        UnassociatedDeposit.countDocuments(query)
      ]);

      return { deposits, total };

    } catch (error) {
      console.error('Error getting unassociated deposits:', error);
      return { deposits: [], total: 0 };
    }
  }

  /**
   * Admin function to update unassociated deposit status
   */
  async updateUnassociatedDepositStatus(
    txHash: string,
    status: 'reviewed' | 'ignored',
    adminId: string,
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const deposit = await UnassociatedDeposit.findOne({ txHash });
      
      if (!deposit) {
        return { success: false, error: 'Deposit not found' };
      }

      deposit.status = status;
      deposit.reviewedBy = adminId as any;
      deposit.reviewedAt = new Date();
      if (adminNotes) deposit.adminNotes = adminNotes;

      await deposit.save();

      console.log(`Admin ${adminId} updated deposit ${txHash} status to ${status}`);

      return { success: true };

    } catch (error) {
      console.error('Error updating unassociated deposit status:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending deposits for user
   */
  async getUserPendingDeposits(userId: string): Promise<any[]> {
    try {
      return await PendingDeposit.find({
        userId,
        status: { $in: ['initiated', 'signed'] }
      }).sort({ initiatedAt: -1 });

    } catch (error) {
      console.error('Error getting user pending deposits:', error);
      return [];
    }
  }

  /**
   * Clean up expired pending deposits
   */
  async cleanupExpiredDeposits(): Promise<void> {
    try {
      const result = await PendingDeposit.updateMany(
        {
          status: { $in: ['initiated', 'signed'] },
          expiresAt: { $lt: new Date() }
        },
        {
          status: 'expired',
          failureReason: 'Deposit expired'
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`Marked ${result.modifiedCount} deposits as expired`);
      }

    } catch (error) {
      console.error('Error cleaning up expired deposits:', error);
    }
  }

  /**
   * Notify admin of unassociated deposit
   */
  private async notifyAdminOfUnassociatedDeposit(deposit: any): Promise<void> {
    // Implementation would depend on your notification system
    // Could send email, webhook, or real-time notification
    console.log(`Admin notification: Unassociated deposit detected - ${deposit.amount} ${deposit.tokenSymbol} from ${deposit.fromAddress}`);
  }