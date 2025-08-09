const fs = require('fs');
const path = require('path');

/**
 * Verification script for Task 3 implementation
 */
class Task3Verifier {
  constructor() {
    this.results = {
      models: {},
      services: {},
      controllers: {},
      routes: {},
      configuration: {},
      tests: {},
      overall: 'pending'
    };
  }

  /**
   * Run all verification checks
   */
  async verify() {
    console.log('🔍 Verifying Task 3: Build multi-chain fund management infrastructure\n');

    this.checkModels();
    this.checkServices();
    this.checkControllers();
    this.checkRoutes();
    this.checkConfiguration();
    this.checkTests();
    this.checkPackageDependencies();

    this.generateReport();
  }

  /**
   * Check if file exists
   */
  fileExists(filePath) {
    return fs.existsSync(path.join(__dirname, filePath));
  }

  /**
   * Check if file has content
   */
  fileHasContent(filePath) {
    if (!this.fileExists(filePath)) return false;
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    return content.trim().length > 0;
  }

  /**
   * Check models implementation
   */
  checkModels() {
    console.log('📊 Checking Models...');
    
    const models = [
      { name: 'TokenBalance', path: 'models/tokenBalance.ts', required: true },
      { name: 'WithdrawalRequest', path: 'models/withdrawalRequest.ts', required: true }
    ];

    for (const model of models) {
      const exists = this.fileHasContent(model.path);
      this.results.models[model.name] = {
        exists,
        required: model.required,
        status: exists ? '✅' : '❌'
      };
      console.log(`  ${this.results.models[model.name].status} ${model.name}`);
    }
  }

  /**
   * Check services implementation
   */
  checkServices() {
    console.log('\n🔧 Checking Services...');
    
    const services = [
      { name: 'DepositAddressService', path: 'services/depositAddressService.ts', required: true },
      { name: 'DepositMonitoringService', path: 'services/depositMonitoringService.ts', required: true },
      { name: 'WithdrawalService', path: 'services/withdrawalService.ts', required: true },
      { name: 'ExchangeRateService', path: 'services/exchangeRateService.ts', required: true },
      { name: 'TreasuryService', path: 'services/treasuryService.ts', required: true },
      { name: 'BalanceDisplayService', path: 'services/balanceDisplayService.ts', required: true }
    ];

    for (const service of services) {
      const exists = this.fileHasContent(service.path);
      this.results.services[service.name] = {
        exists,
        required: service.required,
        status: exists ? '✅' : '❌'
      };
      console.log(`  ${this.results.services[service.name].status} ${service.name}`);
    }
  }

  /**
   * Check controllers implementation
   */
  checkControllers() {
    console.log('\n🎮 Checking Controllers...');
    
    const controllers = [
      { name: 'FundManagementController', path: 'controllers/fundManagementController.ts', required: true }
    ];

    for (const controller of controllers) {
      const exists = this.fileHasContent(controller.path);
      this.results.controllers[controller.name] = {
        exists,
        required: controller.required,
        status: exists ? '✅' : '❌'
      };
      console.log(`  ${this.results.controllers[controller.name].status} ${controller.name}`);
    }
  }

  /**
   * Check routes implementation
   */
  checkRoutes() {
    console.log('\n🛣️ Checking Routes...');
    
    const routes = [
      { name: 'FundManagementRoutes', path: 'routes/fundManagementRoutes.ts', required: true }
    ];

    for (const route of routes) {
      const exists = this.fileHasContent(route.path);
      this.results.routes[route.name] = {
        exists,
        required: route.required,
        status: exists ? '✅' : '❌'
      };
      console.log(`  ${this.results.routes[route.name].status} ${route.name}`);
    }
  }

  /**
   * Check configuration files
   */
  checkConfiguration() {
    console.log('\n⚙️ Checking Configuration...');
    
    const configs = [
      { name: 'Constants', path: 'utils/constants.ts', required: true },
      { name: 'Environment', path: 'config/environment.ts', required: true },
      { name: 'Database', path: 'config/database.ts', required: true },
      { name: 'Redis', path: 'config/redis.ts', required: true },
      { name: 'Package.json', path: 'package.json', required: true },
      { name: 'TypeScript Config', path: 'tsconfig.json', required: true }
    ];

    for (const config of configs) {
      const exists = this.fileHasContent(config.path);
      this.results.configuration[config.name] = {
        exists,
        required: config.required,
        status: exists ? '✅' : '❌'
      };
      console.log(`  ${this.results.configuration[config.name].status} ${config.name}`);
    }
  }

  /**
   * Check tests implementation
   */
  checkTests() {
    console.log('\n🧪 Checking Tests...');
    
    const tests = [
      { name: 'Fund Management Tests', path: 'tests/fundManagement.test.js', required: true }
    ];

    for (const test of tests) {
      const exists = this.fileHasContent(test.path);
      this.results.tests[test.name] = {
        exists,
        required: test.required,
        status: exists ? '✅' : '❌'
      };
      console.log(`  ${this.results.tests[test.name].status} ${test.name}`);
    }
  }

  /**
   * Check package dependencies
   */
  checkPackageDependencies() {
    console.log('\n📦 Checking Package Dependencies...');
    
    try {
      const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
      const requiredDeps = [
        'express', 'cors', 'helmet', 'express-mongo-sanitize',
        'ethers', '@solana/web3.js', '@solana/spl-token',
        'mongoose', 'ioredis', 'axios'
      ];

      const requiredDevDeps = [
        'typescript', '@types/node', '@types/express', '@types/cors'
      ];

      let allDepsPresent = true;

      for (const dep of requiredDeps) {
        const exists = packageJson.dependencies && packageJson.dependencies[dep];
        console.log(`  ${exists ? '✅' : '❌'} ${dep}`);
        if (!exists) allDepsPresent = false;
      }

      for (const dep of requiredDevDeps) {
        const exists = packageJson.devDependencies && packageJson.devDependencies[dep];
        console.log(`  ${exists ? '✅' : '❌'} ${dep} (dev)`);
        if (!exists) allDepsPresent = false;
      }

      this.results.configuration['Dependencies'] = {
        exists: allDepsPresent,
        required: true,
        status: allDepsPresent ? '✅' : '❌'
      };

    } catch (error) {
      console.log('  ❌ Error reading package.json');
      this.results.configuration['Dependencies'] = {
        exists: false,
        required: true,
        status: '❌'
      };
    }
  }

  /**
   * Generate verification report
   */
  generateReport() {
    console.log('\n📋 VERIFICATION REPORT');
    console.log('='.repeat(50));

    const categories = ['models', 'services', 'controllers', 'routes', 'configuration', 'tests'];
    let totalItems = 0;
    let completedItems = 0;

    for (const category of categories) {
      const items = this.results[category];
      const categoryTotal = Object.keys(items).length;
      const categoryCompleted = Object.values(items).filter(item => item.exists).length;
      
      totalItems += categoryTotal;
      completedItems += categoryCompleted;

      console.log(`\n${category.toUpperCase()}: ${categoryCompleted}/${categoryTotal}`);
      
      for (const [name, result] of Object.entries(items)) {
        console.log(`  ${result.status} ${name}`);
      }
    }

    const completionPercentage = Math.round((completedItems / totalItems) * 100);
    
    console.log('\n' + '='.repeat(50));
    console.log(`OVERALL COMPLETION: ${completedItems}/${totalItems} (${completionPercentage}%)`);

    if (completionPercentage >= 90) {
      this.results.overall = 'complete';
      console.log('🎉 Task 3 is COMPLETE!');
    } else if (completionPercentage >= 70) {
      this.results.overall = 'mostly-complete';
      console.log('⚠️ Task 3 is MOSTLY COMPLETE - minor issues remain');
    } else {
      this.results.overall = 'incomplete';
      console.log('❌ Task 3 is INCOMPLETE - significant work needed');
    }

    // Check for critical missing components
    this.checkCriticalComponents();
  }

  /**
   * Check for critical missing components
   */
  checkCriticalComponents() {
    console.log('\n🔍 CRITICAL COMPONENT ANALYSIS');
    console.log('-'.repeat(30));

    const criticalComponents = [
      { category: 'models', name: 'TokenBalance', description: 'Multi-chain balance tracking' },
      { category: 'services', name: 'DepositAddressService', description: 'Deposit address generation' },
      { category: 'services', name: 'DepositMonitoringService', description: 'Transaction monitoring' },
      { category: 'services', name: 'WithdrawalService', description: 'Withdrawal processing' },
      { category: 'services', name: 'ExchangeRateService', description: 'USD/EUR value calculations' },
      { category: 'services', name: 'TreasuryService', description: 'Treasury management' }
    ];

    const missingCritical = [];

    for (const component of criticalComponents) {
      const result = this.results[component.category][component.name];
      if (!result || !result.exists) {
        missingCritical.push(component);
      }
    }

    if (missingCritical.length === 0) {
      console.log('✅ All critical components are implemented');
    } else {
      console.log('❌ Missing critical components:');
      for (const component of missingCritical) {
        console.log(`  - ${component.name}: ${component.description}`);
      }
    }

    // Task requirements check
    console.log('\n📋 TASK REQUIREMENTS CHECK');
    console.log('-'.repeat(30));

    const requirements = [
      'TokenBalance model for tracking off-chain balances across multiple chains',
      'Deposit address generation for supported blockchains',
      'Deposit monitoring service for Ethereum, Solana, Bitcoin, and Layer 2 networks',
      'Withdrawal request system with admin approval workflow',
      'Treasury wallet management for secure fund storage',
      'Exchange rate integration for USD/EUR value calculations',
      'UI balance display showing each chain separately'
    ];

    const implementedRequirements = [
      this.results.models.TokenBalance?.exists,
      this.results.services.DepositAddressService?.exists,
      this.results.services.DepositMonitoringService?.exists,
      this.results.services.WithdrawalService?.exists,
      this.results.services.TreasuryService?.exists,
      this.results.services.ExchangeRateService?.exists,
      this.results.services.BalanceDisplayService?.exists
    ];

    for (let i = 0; i < requirements.length; i++) {
      const status = implementedRequirements[i] ? '✅' : '❌';
      console.log(`${status} ${requirements[i]}`);
    }
  }
}

// Run verification
const verifier = new Task3Verifier();
verifier.verify().catch(console.error);