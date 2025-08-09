import { Request, Response } from 'express';
import DepositAddressService from '../services/depositAddressService';
import DepositMonitoringService from '../services/depositMonitoringService';
import WithdrawalService from '../services/withdrawalService';
import ExchangeRateService from '../services/exchangeRateService';
import TreasuryService from '../services/treasuryService';
import BalanceDisplayService from '../services/balanceDisplayService';
import DepositWorkflowService from '../services/depositWorkflowService';

/**
 * Controller for fund management operations
 */
export class FundManagementController {
  private depositAddressService: DepositAddressService;
  private depositMonitoringService: DepositMonitoringService;
  private withdrawalService: WithdrawalService;
  private exchangeRateService: ExchangeRateService;
  private treasuryService: TreasuryService;
  private balanceDisplayService: BalanceDisplayService;
  private depositWorkflowService: DepositWorkflowService;

  constructor() {
    this.depositAddressService = new DepositAddressService();
    this.depositMonitoringService = new DepositMonitoringService();
    this.withdrawalService = new WithdrawalService();
    this.exchangeRateService = new ExchangeRateService();
    this.treasuryService = new TreasuryService();
    this.balanceDisplayService = new BalanceDisplayService();
    this.depositWorkflowService = new DepositWorkflowService();
  }

  /**
   * Generate deposit address for user
   */
  generateDepositAddress = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, chainId, tokenContract } = req.body;

      if (!userId || !chainId) {
        res.status(400).json({ error: 'userId and chainId are required' });
        return;
      }

      const depositAddress = await this.depositAddressService.generateDepositAddress(
        userId,
        chainId,
        tokenContract
      );

      res.json({
        success: true,
        data: depositAddress
      });
    } catch (error) {
      console.error('Error generating deposit address:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get user balances
   */
  getUserBalances = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { grouped } = req.query;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      let balances;
      if (grouped === 'true') {
        balances = await this.balanceDisplayService.getGroupedUserBalances(userId);
      } else {
        balances = await this.balanceDisplayService.getUserBalances(userId);
      }

      res.json({
        success: true,
        data: balances
      });
    } catch (error) {
      console.error('Error getting user balances:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get user portfolio summary
   */
  getUserPortfolio = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const portfolio = await this.balanceDisplayService.getUserPortfolioSummary(userId);

      res.json({
        success: true,
        data: portfolio
      });
    } catch (error) {
      console.error('Error getting user portfolio:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Create withdrawal request
   */
  createWithdrawal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, chainId, tokenSymbol, tokenContract, amount, destinationAddress } = req.body;

      if (!userId || !chainId || !tokenSymbol || !tokenContract || !amount || !destinationAddress) {
        res.status(400).json({ error: 'All fields are required' });
        return;
      }

      const withdrawal = await this.withdrawalService.createWithdrawalRequest(
        userId,
        chainId,
        tokenSymbol,
        tokenContract,
        amount,
        destinationAddress
      );

      res.json({
        success: true,
        data: withdrawal
      });
    } catch (error) {
      console.error('Error creating withdrawal:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get user withdrawal history
   */
  getUserWithdrawals = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const withdrawals = await this.withdrawalService.getUserWithdrawals(userId);

      res.json({
        success: true,
        data: withdrawals
      });
    } catch (error) {
      console.error('Error getting user withdrawals:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get exchange rates
   */
  getExchangeRates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { tokens } = req.query;
      
      if (!tokens) {
        res.status(400).json({ error: 'tokens parameter is required' });
        return;
      }

      const tokenList = (tokens as string).split(',');
      const rates = await this.exchangeRateService.getMultipleExchangeRates(tokenList);

      const ratesObject = Object.fromEntries(rates);

      res.json({
        success: true,
        data: ratesObject
      });
    } catch (error) {
      console.error('Error getting exchange rates:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get supported chains
   */
  getSupportedChains = async (req: Request, res: Response): Promise<void> => {
    try {
      const chains = this.balanceDisplayService.getSupportedChains();

      res.json({
        success: true,
        data: chains
      });
    } catch (error) {
      console.error('Error getting supported chains:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get deposit monitoring status
   */
  getMonitoringStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.depositMonitoringService.getMonitoringStatus();

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      console.error('Error getting monitoring status:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Start deposit monitoring
   */
  startMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.depositMonitoringService.startMonitoring();

      res.json({
        success: true,
        message: 'Deposit monitoring started'
      });
    } catch (error) {
      console.error('Error starting monitoring:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Stop deposit monitoring
   */
  stopMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      this.depositMonitoringService.stopMonitoring();

      res.json({
        success: true,
        message: 'Deposit monitoring stopped'
      });
    } catch (error) {
      console.error('Error stopping monitoring:', error);
      res.status(500).json({ error: error.message });
    }
  };

  // Admin endpoints

  /**
   * Get pending withdrawals (admin)
   */
  getPendingWithdrawals = async (req: Request, res: Response): Promise<void> => {
    try {
      const withdrawals = await this.withdrawalService.getPendingWithdrawals();

      res.json({
        success: true,
        data: withdrawals
      });
    } catch (error) {
      console.error('Error getting pending withdrawals:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Approve withdrawal (admin)
   */
  approveWithdrawal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      const { adminId, adminNotes } = req.body;

      if (!adminId) {
        res.status(400).json({ error: 'adminId is required' });
        return;
      }

      const withdrawal = await this.withdrawalService.approveWithdrawal(
        requestId,
        adminId,
        adminNotes
      );

      res.json({
        success: true,
        data: withdrawal
      });
    } catch (error) {
      console.error('Error approving withdrawal:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Reject withdrawal (admin)
   */
  rejectWithdrawal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      const { adminId, adminNotes } = req.body;

      if (!adminId || !adminNotes) {
        res.status(400).json({ error: 'adminId and adminNotes are required' });
        return;
      }

      const withdrawal = await this.withdrawalService.rejectWithdrawal(
        requestId,
        adminId,
        adminNotes
      );

      res.json({
        success: true,
        data: withdrawal
      });
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Process withdrawal (admin)
   */
  processWithdrawal = async (req: Request, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;

      const result = await this.withdrawalService.processWithdrawal(requestId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get treasury balances (admin)
   */
  getTreasuryBalances = async (req: Request, res: Response): Promise<void> => {
    try {
      const balances = await this.treasuryService.getAllTreasuryBalances();

      res.json({
        success: true,
        data: balances
      });
    } catch (error) {
      console.error('Error getting treasury balances:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get treasury health (admin)
   */
  getTreasuryHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.treasuryService.getTreasuryHealth();

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Error getting treasury health:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Health check endpoint
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const exchangeRateHealth = await this.exchangeRateService.healthCheck();
      const treasuryHealth = await this.treasuryService.getTreasuryHealth();
      const monitoringStatus = this.depositMonitoringService.getMonitoringStatus();

      res.json({
        success: true,
        data: {
          exchangeRates: exchangeRateHealth,
          treasury: treasuryHealth,
          monitoring: monitoringStatus,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error in health check:', error);
      res.status(500).json({ error: error.message });
    }
  };
}

export default FundManagementController;  
/**
   * Get unassociated deposits (admin)
   */
  getUnassociatedDeposits = async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, chainId, limit = 50, offset = 0 } = req.query;

      const result = await this.depositWorkflowService.getUnassociatedDeposits(
        status as string,
        chainId as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error getting unassociated deposits:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Update unassociated deposit status (admin)
   */
  updateUnassociatedDepositStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { txHash } = req.params;
      const { status, adminId, adminNotes } = req.body;

      if (!adminId || !status) {
        res.status(400).json({ error: 'adminId and status are required' });
        return;
      }

      const result = await this.depositWorkflowService.updateUnassociatedDepositStatus(
        txHash,
        status,
        adminId,
        adminNotes
      );

      res.json({
        success: result.success,
        error: result.error
      });
    } catch (error) {
      console.error('Error updating unassociated deposit status:', error);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * Get user pending deposits
   */
  getUserPendingDeposits = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'userId is required' });
        return;
      }

      const deposits = await this.depositWorkflowService.getUserPendingDeposits(userId);

      res.json({
        success: true,
        data: deposits
      });
    } catch (error) {
      console.error('Error getting user pending deposits:', error);
      res.status(500).json({ error: error.message });
    }
  };