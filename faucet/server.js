import express from 'express';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import fetch from 'node-fetch';
import crypto from 'crypto';
import elliptic from 'elliptic';

const EC = elliptic.ec;
const ec = new EC('secp256k1');

// Standalone Wallet Class (no external dependencies)
class FaucetWallet {
  constructor(privateKey = null) {
    if (privateKey) {
      this.keyPair = ec.keyFromPrivate(privateKey, 'hex');
      this.privateKey = privateKey;
    } else {
      this.keyPair = ec.genKeyPair();
      this.privateKey = this.keyPair.getPrivate('hex');
    }
    
    this.publicKey = this.keyPair.getPublic('hex');
    this.address = this.deriveAddress(this.publicKey);
  }

  deriveAddress(publicKey) {
    return crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .substring(0, 40);
  }

  sign(hash) {
    const sig = this.keyPair.sign(hash);
    return {
      r: sig.r.toString('hex'),
      s: sig.s.toString('hex')
    };
  }

  export() {
    return {
      address: this.address,
      publicKey: this.publicKey,
      privateKey: this.privateKey
    };
  }
}

class FaucetServer {
  constructor(config) {
    this.config = config;
    this.app = express();
    this.port = config.faucetPort || 4000;
    this.apiBase = config.apiBase || 'http://localhost:3000/api';
    
    this.wallet = null;
    
    this.addressRequests = new Map();
    this.ipRequests = new Map();
    
    this.ipCooldown = 600000;
    this.addressCooldown = 600000;
    this.maxDailyRequests = 5;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  async initialize() {
    this.wallet = new FaucetWallet();
    
    console.log('\n💧 Faucet Server Initialized');
    console.log(`📍 Faucet Address: ${this.wallet.address}`);
    console.log(`💰 Amount per request: ${this.config.faucetAmount} SAYM`);
    console.log(`⏱️  Cooldown: ${this.ipCooldown / 1000}s`);
    console.log(`📊 Max daily requests: ${this.maxDailyRequests}\n`);
  }

  setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
    
    const limiter = rateLimit({
      windowMs: 60000,
      max: 10,
      message: { error: 'Too many requests, please try again later' }
    });
    
    this.app.use(limiter);
  }

  setupRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'online',
        faucetAddress: this.wallet ? this.wallet.address : 'initializing',
        amount: this.config.faucetAmount,
        cooldown: this.ipCooldown / 1000,
        maxDaily: this.maxDailyRequests
      });
    });

    this.app.post('/request', async (req, res) => {
      try {
        const { address } = req.body;
        const ip = req.ip || req.connection.remoteAddress;

        if (!address || address.length !== 40) {
          return res.status(400).json({
            error: 'Invalid address format'
          });
        }

        const ipCheck = this.checkIPCooldown(ip);
        if (!ipCheck.allowed) {
          return res.status(429).json({
            error: 'IP rate limit exceeded',
            message: `Please wait ${Math.ceil(ipCheck.waitTime / 1000)}s before next request`,
            waitTime: ipCheck.waitTime
          });
        }

        const addressCheck = this.checkAddressCooldown(address);
        if (!addressCheck.allowed) {
          return res.status(429).json({
            error: 'Address rate limit exceeded',
            message: `Please wait ${Math.ceil(addressCheck.waitTime / 1000)}s before next request`,
            waitTime: addressCheck.waitTime
          });
        }

        const dailyCheck = this.checkDailyLimit(address);
        if (!dailyCheck.allowed) {
          return res.status(429).json({
            error: 'Daily limit exceeded',
            message: `Maximum ${this.maxDailyRequests} requests per day`,
            remainingToday: 0
          });
        }

        const balanceRes = await fetch(`${this.apiBase}/address/${this.wallet.address}`);
        const balanceData = await balanceRes.json();

        if (balanceData.balance < this.config.faucetAmount) {
          return res.status(503).json({
            error: 'Faucet is empty',
            message: 'Please try again later or contact administrator'
          });
        }

        const nonce = balanceData.nonce || 0;

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

        const broadcastRes = await fetch(`${this.apiBase}/broadcast`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signedTx)
        });

        const result = await broadcastRes.json();

        if (result.success) {
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

    this.app.get('/stats', async (req, res) => {
      try {
        const balanceRes = await fetch(`${this.apiBase}/address/${this.wallet.address}`);
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
    const oneDayAgo = now - 86400000;
    const requests = this.addressRequests.get(address) || [];
    const todayRequests = requests.filter(t => t > oneDayAgo);

    if (todayRequests.length >= this.maxDailyRequests) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: this.maxDailyRequests - todayRequests.length };
  }

  recordRequest(ip, address) {
    const now = Date.now();

    const ipRequests = this.ipRequests.get(ip) || [];
    ipRequests.push(now);
    this.ipRequests.set(ip, ipRequests);

    const addressRequests = this.addressRequests.get(address) || [];
    addressRequests.push(now);
    this.addressRequests.set(address, addressRequests);

    this.cleanup();
  }

  cleanup() {
    const now = Date.now();
    const oneDayAgo = now - 86400000;

    for (const [ip, requests] of this.ipRequests.entries()) {
      const recent = requests.filter(t => t > oneDayAgo);
      if (recent.length === 0) {
        this.ipRequests.delete(ip);
      } else {
        this.ipRequests.set(ip, recent);
      }
    }

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
    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`✅ Faucet server running on http://0.0.0.0:${this.port}`);
      console.log(`🔗 Connected to blockchain API: ${this.apiBase}\n`);
    });

    setInterval(() => {
      this.cleanup();
    }, 3600000);
  }
}

// Main execution
const config = {
  faucetPort: parseInt(process.env.FAUCET_PORT || process.env.PORT || '10000'),
  apiBase: process.env.API_BASE || 'http://localhost:3000/api',
  faucetAmount: parseInt(process.env.FAUCET_AMOUNT || '100')
};

console.log('🚀 Starting Faucet Server...');
console.log(`📡 API Base: ${config.apiBase}`);
console.log(`🌐 Port: ${config.faucetPort}`);

const faucetServer = new FaucetServer(config);
await faucetServer.initialize();
faucetServer.listen();

export default FaucetServer;