const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');

// Mock data
const mockUserId = new mongoose.Types.ObjectId().toString();
const mockChainId = 'ethereum';
const mockTokenContract = 'native';

describe('Fund Management Service', () => {
  beforeAll(async () => {
    // Setup test database connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/naffles-test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Health Check', () => {
    test('GET /health should return service status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('service', 'fund-management-service');
    });

    test('GET /api/fund-management/health should return detailed health', async () => {
      const response = await request(app)
        .get('/api/fund-management/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('exchangeRates');
      expect(response.body.data).toHaveProperty('treasury');
      expect(response.body.data).toHaveProperty('monitoring');
    });
  });

  describe('Deposit Address Generation', () => {
    test('POST /api/fund-management/deposit/address should generate address', async () => {
      const response = await request(app)
        .post('/api/fund-management/deposit/address')
        .send({
          userId: mockUserId,
          chainId: mockChainId,
          tokenContract: mockTokenContract
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('address');
      expect(response.body.data).toHaveProperty('chainId', mockChainId);
      expect(response.body.data).toHaveProperty('isNativeToken', true);
    });

    test('POST /api/fund-management/deposit/address should fail without required fields', async () => {
      const response = await request(app)
        .post('/api/fund-management/deposit/address')
        .send({
          userId: mockUserId
          // Missing chainId
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('User Balances', () => {
    test('GET /api/fund-management/balances/:userId should return user balances', async () => {
      const response = await request(app)
        .get(`/api/fund-management/balances/${mockUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('GET /api/fund-management/balances/:userId?grouped=true should return grouped balances', async () => {
      const response = await request(app)
        .get(`/api/fund-management/balances/${mockUserId}?grouped=true`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('GET /api/fund-management/portfolio/:userId should return portfolio summary', async () => {
      const response = await request(app)
        .get(`/api/fund-management/portfolio/${mockUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalValueUSD');
      expect(response.body.data).toHaveProperty('totalValueEUR');
      expect(response.body.data).toHaveProperty('tokenCount');
      expect(response.body.data).toHaveProperty('chainCount');
    });
  });

  describe('Withdrawal Requests', () => {
    test('POST /api/fund-management/withdrawal should create withdrawal request', async () => {
      const response = await request(app)
        .post('/api/fund-management/withdrawal')
        .send({
          userId: mockUserId,
          chainId: mockChainId,
          tokenSymbol: 'ETH',
          tokenContract: 'native',
          amount: '0.1',
          destinationAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', 'pending');
    });

    test('GET /api/fund-management/withdrawals/:userId should return user withdrawals', async () => {
      const response = await request(app)
        .get(`/api/fund-management/withdrawals/${mockUserId}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Exchange Rates', () => {
    test('GET /api/fund-management/exchange-rates should return rates for tokens', async () => {
      const response = await request(app)
        .get('/api/fund-management/exchange-rates?tokens=ETH,BTC,SOL')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Object);
    });

    test('GET /api/fund-management/exchange-rates should fail without tokens parameter', async () => {
      const response = await request(app)
        .get('/api/fund-management/exchange-rates')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Supported Chains', () => {
    test('GET /api/fund-management/chains should return supported chains', async () => {
      const response = await request(app)
        .get('/api/fund-management/chains')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Monitoring', () => {
    test('GET /api/fund-management/monitoring/status should return monitoring status', async () => {
      const response = await request(app)
        .get('/api/fund-management/monitoring/status')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('isMonitoring');
      expect(response.body.data).toHaveProperty('activeChains');
    });
  });

  describe('Admin Endpoints', () => {
    test('GET /api/fund-management/admin/withdrawals/pending should return pending withdrawals', async () => {
      const response = await request(app)
        .get('/api/fund-management/admin/withdrawals/pending')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('GET /api/fund-management/admin/treasury/balances should return treasury balances', async () => {
      const response = await request(app)
        .get('/api/fund-management/admin/treasury/balances')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    test('GET /api/fund-management/admin/treasury/health should return treasury health', async () => {
      const response = await request(app)
        .get('/api/fund-management/admin/treasury/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data).toHaveProperty('chains');
    });
  });
});

module.exports = app;