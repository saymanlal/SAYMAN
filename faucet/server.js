import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import fetch from 'node-fetch';
import Wallet from '../wallet/wallet.js';
import crypto from 'crypto';

class FaucetServer {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.port = config.faucetPort || 4000;
    this.apiBase = config.apiBase || 'http://localhost:3000/api';
    
    // Faucet wallet (should be pre-funded)
    this.wallet = null;
    
    // Request tracking
    this.addressRequests = new Map(); // address -> [timestamps]
    this.ipRequests = new Map();      // ip -> [timestamps]
    
    // Cooldowns
    this.ipCooldown = 600000;         // 10 minutes
    this.addressCooldown = 600000;    // 10 minutes
    this.maxDailyRequests = 5;        // Per address
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  async initialize() {
    // Load or create faucet wallet
    this.wallet = new Wallet();
    
    console.log('\n💧 Faucet Server Initialized');
    console.log(`📍 Faucet Address: ${this.wallet.address}`);
    console.log(`💰 Amount per request: ${this.config.faucetAmount} SAYM`);
    console.log(`⏱️  Cooldown: ${this.ipCooldown / 1000}s`);
    console.log(`📊 Max daily requests: ${this.maxDailyRequests}\n`);
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Global rate limiter
    const limiter = rateLimit({
      windowMs: 60000, // 1 minute
      max: 10,
      message: { error: 'Too many requests, please try again later' }
    });
    
    this.app.use(limiter);
  }

  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'online',
        faucetAddress: this.wallet.address,
        amount: this.config.faucetAmount,
        cooldown: this.ipCooldown / 1000,
        maxDaily: this.maxDailyRequests
      });
    });

    // Request tokens
    this.app.post('/request', async (req, res) => {
      try {
        const { address } = req.body;
        const ip = req.ip || req.connection.remoteAddress;

        // Validate address
        if (!address || address.length !== 40) {
          return res.status(400).json({
            error: 'Invalid address format'
          });
        }

        // Check IP cooldown
        const ipCheck = this.checkIPCooldown(ip);
        if (!ipCheck.allowed) {
          return res.status(429).json({
            error: 'IP rate limit exceeded',
            message: `Please wait ${Math.ceil(ipCheck.waitTime / 1000)}s before next request`,
            waitTime: ipCheck.waitTime
          });
        }

        // Check address cooldown
        const addressCheck = this.checkAddressCooldown(address);
        if (!addressCheck.allowed) {
          return res.status(429).json({
            error: 'Address rate limit exceeded',
            message: `Please wait ${Math.ceil(addressCheck.waitTime / 1000)}s before next request`,
            waitTime: addressCheck.waitTime
          });
        }

        // Check daily limit
        const dailyCheck = this.checkDailyLimit(address);
        if (!dailyCheck.allowed) {
          return res.status(429).json({
            error: 'Daily limit exceeded',
            message: `Maximum ${this.maxDailyRequests} requests per day`,
            remainingToday: 0
          });
        }

        // Get faucet balance
        const balanceRes = await fetch(`${this.apiBase}/balance/${this.wallet.address}`);
        const balanceData = await balanceRes.json();

        if (balanceData.balance < this.config.faucetAmount) {
          return res.status(503).json({
            error: 'Faucet is empty',
            message: 'Please try again later or contact administrator'
          });
        }

        // Get nonce
        const nonce = balanceData.nonce;

        // Create and sign transaction
        const txData = {
          type: 'TRANSFER',
          data: {
            from: this.wallet.address,
            to: address,
            amount: this.config.faucetAmount
          },
          timestamp: Date.now(),
          gasLimit: 50000,
          gasPrice: 1,
          nonce: nonce
        };

        const txHash = crypto
          .createHash('sha256')
          .update(JSON.stringify({
            type: txData.type,
            timestamp: txData.timestamp,
            data: txData.data,
            gasLimit: txData.gasLimit,
            gasPrice: txData.gasPrice,
            nonce: txData.nonce
          }))
          .digest('hex');

        const signature = this.wallet.sign(txHash);

        const signedTx = {
          ...txData,
          signature: signature,
          publicKey: this.wallet.publicKey
        };

        // Broadcast transaction
        const broadcastRes = await fetch(`${this.apiBase}/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signedTx)
        });

        const result = await broadcastRes.json();

        if (result.success) {
          // Record request
          this.recordRequest(ip, address);

          console.log(`💧 Faucet sent ${this.config.faucetAmount} SAYM to ${address.substring(0, 8)}... from IP ${ip}`);

          res.json({
            success: true,
            amount: this.config.faucetAmount,
            txId: result.txId,
            message: `${this.config.faucetAmount} SAYM sent successfully`,
            estimatedTime: '~5-10 seconds'
          });
        } else {
          res.status(400).json({
            error: result.error || 'Transaction failed'
          });
        }

      } catch (error) {
        console.error('Faucet error:', error);
        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // Stats endpoint
    this.app.get('/stats', async (req, res) => {
      try {
        const balanceRes = await fetch(`${this.apiBase}/balance/${this.wallet.address}`);
        const balanceData = await balanceRes.json();

        res.json({
          faucetAddress: this.wallet.address,
          balance: balanceData.balance,
          amountPerRequest: this.config.faucetAmount,
          remainingRequests: Math.floor(balanceData.balance / this.config.faucetAmount),
          cooldown: this.ipCooldown / 1000,
          maxDailyPerAddress: this.maxDailyRequests,
          totalRequestsToday: this.getTodayRequestCount()
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  checkIPCooldown(ip) {
    const now = Date.now();
    const requests = this.ipRequests.get(ip) || [];
    const recentRequests = requests.filter(t => now - t < this.ipCooldown);

    if (recentRequests.length > 0) {
      const lastRequest = Math.max(...recentRequests);
      const waitTime = this.ipCooldown - (now - lastRequest);
      
      if (waitTime > 0) {
        return { allowed: false, waitTime };
      }
    }

    return { allowed: true };
  }

  checkAddressCooldown(address) {
    const now = Date.now();
    const requests = this.addressRequests.get(address) || [];
    const recentRequests = requests.filter(t => now - t < this.addressCooldown);

    if (recentRequests.length > 0) {
      const lastRequest = Math.max(...recentRequests);
      const waitTime = this.addressCooldown - (now - lastRequest);
      
      if (waitTime > 0) {
        return { allowed: false, waitTime };
      }
    }

    return { allowed: true };
  }

  checkDailyLimit(address) {
    const now = Date.now();
    const oneDayAgo = now - 86400000; // 24 hours
    const requests = this.addressRequests.get(address) || [];
    const todayRequests = requests.filter(t => t > oneDayAgo);

    if (todayRequests.length >= this.maxDailyRequests) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: this.maxDailyRequests - todayRequests.length };
  }

  recordRequest(ip, address) {
    const now = Date.now();

    // Record IP
    const ipRequests = this.ipRequests.get(ip) || [];
    ipRequests.push(now);
    this.ipRequests.set(ip, ipRequests);

    // Record address
    const addressRequests = this.addressRequests.get(address) || [];
    addressRequests.push(now);
    this.addressRequests.set(address, addressRequests);

    // Cleanup old requests (older than 24 hours)
    this.cleanup();
  }

  cleanup() {
    const now = Date.now();
    const oneDayAgo = now - 86400000;

    // Cleanup IP requests
    for (const [ip, requests] of this.ipRequests.entries()) {
      const recent = requests.filter(t => t > oneDayAgo);
      if (recent.length === 0) {
        this.ipRequests.delete(ip);
      } else {
        this.ipRequests.set(ip, recent);
      }
    }

    // Cleanup address requests
    for (const [address, requests] of this.addressRequests.entries()) {
      const recent = requests.filter(t => t > oneDayAgo);
      if (recent.length === 0) {
        this.addressRequests.delete(address);
      } else {
        this.addressRequests.set(address, recent);
      }
    }
  }

  getTodayRequestCount() {
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    let total = 0;

    for (const requests of this.addressRequests.values()) {
      total += requests.filter(t => t > oneDayAgo).length;
    }

    return total;
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`✅ Faucet server running on http://localhost:${this.port}`);
      console.log(`🔗 Connected to blockchain API: ${this.apiBase}\n`);
    });

    // Periodic cleanup
    setInterval(() => {
      this.cleanup();
    }, 3600000); // Every hour
  }
}

// Standalone execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = {
    faucetPort: process.env.FAUCET_PORT || 4000,
    apiBase: process.env.API_BASE || 'http://localhost:3000/api',
    faucetAmount: parseInt(process.env.FAUCET_AMOUNT || '100')
  };

  const faucetServer = new FaucetServer(config);
  await faucetServer.initialize();
  faucetServer.listen();
}

export default FaucetServer;