import { Router } from 'express';
import FundManagementController from '../controllers/fundManagementController';

const router = Router();
const fundController = new FundManagementController();

// User endpoints
router.post('/deposit/address', fundController.generateDepositAddress);
router.get('/balances/:userId', fundController.getUserBalances);
router.get('/portfolio/:userId', fundController.getUserPortfolio);
router.post('/withdrawal', fundController.createWithdrawal);
router.get('/withdrawals/:userId', fundController.getUserWithdrawals);

// Public endpoints
router.get('/exchange-rates', fundController.getExchangeRates);
router.get('/chains', fundController.getSupportedChains);
router.get('/health', fundController.healthCheck);

// Monitoring endpoints
router.get('/monitoring/status', fundController.getMonitoringStatus);
router.post('/monitoring/start', fundController.startMonitoring);
router.post('/monitoring/stop', fundController.stopMonitoring);

// Admin endpoints
router.get('/admin/withdrawals/pending', fundController.getPendingWithdrawals);
router.post('/admin/withdrawals/:requestId/approve', fundController.approveWithdrawal);
router.post('/admin/withdrawals/:requestId/reject', fundController.rejectWithdrawal);
router.post('/admin/withdrawals/:requestId/process', fundController.processWithdrawal);
router.get('/admin/treasury/balances', fundController.getTreasuryBalances);
router.get('/admin/treasury/health', fundController.getTreasuryHealth);

// Unassociated deposits (admin)
router.get('/admin/deposits/unassociated', fundController.getUnassociatedDeposits);
router.put('/admin/deposits/unassociated/:txHash', fundController.updateUnassociatedDepositStatus);

// Pending deposits
router.get('/deposits/pending/:userId', fundController.getUserPendingDeposits);

export default router;