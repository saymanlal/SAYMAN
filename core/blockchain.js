import { Level } from 'level';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Block from './block.js';
import Transaction from './transaction.js';
import StateEngine from './state.js';
import PoS from './pos.js';
import ContractEngine from './contracts.js';
import GasCalculator from './gas.js';
import NonceManager from './nonce.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Blockchain {
  constructor(config) {
    this.config = config;
    this.chainId = config.chainId;
    this.networkName = config.networkName || 'Sayman Network';
    
    // Database path - use /tmp for Render.com ephemeral storage
    const dbPath = process.env.NODE_ENV === 'production' 
      ? '/tmp/sayman-data'
      : path.join(process.cwd(), 'data');
    
    this.db = new Level(dbPath, { valueEncoding: 'json' });
    this.chain = [];
    this.mempool = [];
    
    // State management
    this.state = new StateEngine();
    this.pos = new PoS(config);
    this.contracts = new ContractEngine();
    this.gasCalculator = new GasCalculator(config);
    this.nonceManager = new NonceManager();
    
    // Rate limiting
    this.addressLastTx = new Map();
    this.txRateLimit = 10;
    this.rateLimitWindow = 60000;
  }

  async initialize() {
    console.log('🔄 Initializing blockchain...');
    
    try {
      // Ensure data directory exists
      const dataDir = process.env.NODE_ENV === 'production'
        ? '/tmp/sayman-data'
        : path.join(process.cwd(), 'data');
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Open database with error handling
      if (!this.db || this.db.status !== 'open') {
        try {
          await this.db.open();
          console.log('✅ Database opened');
        } catch (error) {
          if (error.code === 'LEVEL_DATABASE_NOT_OPEN') {
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            throw error;
          }
        }
      }

      // Load existing chain or create genesis
      try {
        const chainData = await this.db.get('blockchain');
        console.log('📚 Loading existing blockchain...');
        
        const parsedChain = JSON.parse(chainData);
        
        this.chain = [];
        for (const blockData of parsedChain) {
          const block = await Block.fromJSON(blockData);
          this.chain.push(block);
        }

        console.log(`✅ Loaded ${this.chain.length} blocks from database`);

        console.log('🔄 Rebuilding state from blockchain...');
        await this.rebuildStateFromChain();
        console.log('✅ State rebuilt successfully');

      } catch (error) {
        if (error.code === 'LEVEL_NOT_FOUND' || error.notFound) {
          console.log('🌱 Creating genesis block...');
          const genesisBlock = await this.createGenesisBlock();
          this.chain = [genesisBlock];
          await this.saveChain();
          console.log('✅ Genesis block created');
        } else {
          throw error;
        }
      }

      console.log('✅ Blockchain initialization complete');
      console.log(`📊 Current height: ${this.chain.length}`);

    } catch (error) {
      console.error('❌ Error initializing blockchain:', error);
      throw error;
    }
  }

  async createGenesisBlock() {
    const genesisTransactions = [];

    Object.entries(this.config.genesisAllocations || {}).forEach(([address, amount]) => {
      const tx = new Transaction({
        type: 'GENESIS',
        data: { to: address, amount },
        timestamp: Date.now(),
        gasLimit: 0,
        gasPrice: 0,
        nonce: 0
      });
      genesisTransactions.push(tx);
      this.state.addBalance(address, amount);
    });

    Object.entries(this.config.genesisStakes || {}).forEach(([address, amount]) => {
      const tx = new Transaction({
        type: 'STAKE',
        data: { from: address, amount },
        timestamp: Date.now(),
        gasLimit: 0,
        gasPrice: 0,
        nonce: 0
      });
      genesisTransactions.push(tx);
      this.state.stake(address, amount);
      this.pos.addValidator(address, amount);
    });

    const genesisBlock = new Block(
      0,
      Date.now(),
      genesisTransactions,
      '0',
      'genesis',
      this.chainId
    );

    genesisBlock.hash = genesisBlock.calculateHash();

    return genesisBlock;
  }

  async saveChain() {
    try {
      const chainData = JSON.stringify(this.chain.map(block => block.toJSON()));
      await this.db.put('blockchain', chainData);
    } catch (error) {
      console.error('Error saving blockchain:', error);
    }
  }

  async rebuildStateFromChain() {
    this.state = new StateEngine();
    this.pos = new PoS(this.config);
    this.nonceManager = new NonceManager();

    for (const block of this.chain) {
      this.applyBlock(block);
    }
  }

  applyBlock(block) {
    for (const tx of block.transactions) {
      this.applyTransaction(tx, block.validator);
    }
  }

  applyTransaction(tx, validator = null) {
    switch (tx.type) {
      case 'GENESIS':
        this.state.addBalance(tx.data.to, tx.data.amount);
        break;

      case 'TRANSFER':
        this.state.transfer(tx.data.from, tx.data.to, tx.data.amount);
        this.nonceManager.incrementNonce(tx.data.from);
        if (tx.gasUsed && validator) {
          this.state.addBalance(validator, tx.gasUsed * tx.gasPrice);
        }
        break;

      case 'STAKE':
        this.state.stake(tx.data.from, tx.data.amount);
        this.pos.addValidator(tx.data.from, tx.data.amount);
        this.nonceManager.incrementNonce(tx.data.from);
        if (tx.gasUsed && validator) {
          this.state.addBalance(validator, tx.gasUsed * tx.gasPrice);
        }
        break;

      case 'UNSTAKE':
        this.state.unstake(tx.data.from);
        this.pos.removeValidator(tx.data.from);
        this.nonceManager.incrementNonce(tx.data.from);
        if (tx.gasUsed && validator) {
          this.state.addBalance(validator, tx.gasUsed * tx.gasPrice);
        }
        break;

      case 'REWARD':
        this.state.addBalance(tx.data.to, tx.data.amount);
        break;

      case 'REWARD_FEE':
        this.state.addBalance(tx.data.to, tx.data.amount);
        break;

      case 'CONTRACT_DEPLOY':
        this.contracts.deploy(tx.data.contractAddress, tx.data.code, tx.data.from);
        this.nonceManager.incrementNonce(tx.data.from);
        if (tx.gasUsed && validator) {
          this.state.addBalance(validator, tx.gasUsed * tx.gasPrice);
        }
        break;

      case 'CONTRACT_CALL':
        this.nonceManager.incrementNonce(tx.data.from);
        if (tx.gasUsed && validator) {
          this.state.addBalance(validator, tx.gasUsed * tx.gasPrice);
        }
        break;

      case 'SLASH':
        this.state.slash(tx.data.address, tx.data.amount);
        this.pos.slashValidator(tx.data.address, tx.data.amount);
        break;
    }
  }

  async createBlock() {
    const lastBlock = this.getLastBlock();
    const validator = this.pos.selectValidator(lastBlock.validator);

    if (!validator) {
      return null;
    }

    const pendingTransactions = this.mempool.splice(0, 100);
    const validTransactions = [];
    let totalGasUsed = 0;

    for (const tx of pendingTransactions) {
      if (this.isValidTransaction(tx)) {
        const gasUsed = this.gasCalculator.calculateGas(tx.type, tx.data);
        
        if (totalGasUsed + gasUsed <= this.config.gasLimits.maxGasPerBlock) {
          tx.gasUsed = gasUsed;
          validTransactions.push(tx);
          totalGasUsed += gasUsed;
          
          this.applyTransaction(tx, validator);
          
          if (gasUsed > 0) {
            const feeReward = new Transaction({
              type: 'REWARD_FEE',
              data: { to: validator, amount: gasUsed * tx.gasPrice },
              timestamp: Date.now(),
              gasLimit: 0,
              gasPrice: 0,
              nonce: 0
            });
            validTransactions.push(feeReward);
          }
        }
      }
    }

    const rewardTx = new Transaction({
      type: 'REWARD',
      data: { to: validator, amount: this.config.blockReward },
      timestamp: Date.now(),
      gasLimit: 0,
      gasPrice: 0,
      nonce: 0
    });
    validTransactions.push(rewardTx);
    this.state.addBalance(validator, this.config.blockReward);

    const newBlock = new Block(
      this.chain.length,
      Date.now(),
      validTransactions,
      lastBlock.hash,
      validator,
      this.chainId
    );

    newBlock.hash = newBlock.calculateHash();
    newBlock.gasUsed = totalGasUsed;

    this.chain.push(newBlock);
    await this.saveChain();

    console.log(`⛏️  Block #${newBlock.index} mined by ${validator.substring(0, 8)}... (${validTransactions.length} txs, ${totalGasUsed} gas)`);

    return newBlock;
  }

  isValidTransaction(tx) {
    try {
      if (!tx.isValid(this.state.publicKeys)) {
        return false;
      }

      const nonce = this.nonceManager.getNonce(tx.data.from);
      if (tx.nonce !== nonce) {
        console.log(`Invalid nonce for ${tx.data.from}: expected ${nonce}, got ${tx.nonce}`);
        return false;
      }

      if (!this.checkRateLimit(tx.data.from)) {
        return false;
      }

      if (tx.type === 'TRANSFER') {
        const totalCost = tx.data.amount + (tx.gasLimit * tx.gasPrice);
        if (this.state.getBalance(tx.data.from) < totalCost) {
          return false;
        }
      }

      if (tx.type === 'STAKE') {
        const totalCost = tx.data.amount + (tx.gasLimit * tx.gasPrice);
        if (this.state.getBalance(tx.data.from) < totalCost) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Transaction validation error:', error);
      return false;
    }
  }

  checkRateLimit(address) {
    const now = Date.now();
    const lastTxTimes = this.addressLastTx.get(address) || [];
    const recentTxs = lastTxTimes.filter(time => now - time < this.rateLimitWindow);

    if (recentTxs.length >= this.txRateLimit) {
      return false;
    }

    recentTxs.push(now);
    this.addressLastTx.set(address, recentTxs);

    return true;
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  isValidChain(chain) {
    if (JSON.stringify(chain[0]) !== JSON.stringify(this.chain[0])) {
      return false;
    }

    for (let i = 1; i < chain.length; i++) {
      const block = chain[i];
      const prevBlock = chain[i - 1];

      if (block.previousHash !== prevBlock.hash) {
        return false;
      }

      if (block.hash !== block.calculateHash()) {
        return false;
      }

      if (block.chainId !== this.chainId) {
        return false;
      }
    }

    return true;
  }

  async replaceChain(newChain) {
    if (newChain.length <= this.chain.length) {
      return false;
    }

    if (!this.isValidChain(newChain)) {
      return false;
    }

    this.chain = newChain;
    await this.rebuildStateFromChain();
    await this.saveChain();

    return true;
  }

  getStats() {
    return {
      network: this.networkName,
      chainId: this.chainId,
      blocks: this.chain.length,
      mempool: this.mempool.length,
      validators: this.pos.validators.size,
      totalStake: Array.from(this.pos.validators.values()).reduce((sum, v) => sum + v.stake, 0),
      contracts: this.contracts.contracts.size
    };
  }

  static reconstructTransaction(txData) {
    return new Transaction(txData);
  }

  async close() {
    try {
      await this.saveChain();
      await this.db.close();
      console.log('✅ Database closed');
    } catch (error) {
      console.error('Error closing database:', error);
    }
  }
}

export default Blockchain;