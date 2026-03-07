import Block from './block.js';
import Transaction from './transaction.js';
import StateEngine from './state.js';
import ProofOfStake from './pos.js';
import ContractEngine from './contracts.js';
import GasCalculator from './gas.js';
import { Level } from 'level';

class Blockchain {
  constructor(config) {
    this.config = config;
    this.chainId = config.chainId;
    this.chain = [];
    this.mempool = [];
    this.state = new StateEngine();
    this.pos = new ProofOfStake(this.state, config);
    this.gas = new GasCalculator(config);
    this.contracts = new ContractEngine(this.state, this.gas);
    this.db = new Level(`./data/${config.chainId}_${config.p2pPort}`, { valueEncoding: 'json' });
    this.isProducing = false;
    
    // Anti-spam
    this.mempoolLimit = 1000;
    this.addressTxCount = new Map(); // address -> tx count in last minute
    this.lastCleanup = Date.now();
  }

  async initialize() {
    console.log('🔄 Initializing blockchain...');
    
    try {
      // Ensure data directory exists
      const dataDir = path.join(process.cwd(), 'data');
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
            // Database already opening/opened, wait a bit
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
        
        // Reconstruct blocks
        this.chain = [];
        for (const blockData of parsedChain) {
          const block = await Block.fromJSON(blockData);
          this.chain.push(block);
        }
  
        console.log(`✅ Loaded ${this.chain.length} blocks from database`);
  
        // Rebuild state from chain
        console.log('🔄 Rebuilding state from blockchain...');
        await this.rebuildStateFromChain();
        console.log('✅ State rebuilt successfully');
  
      } catch (error) {
        if (error.code === 'LEVEL_NOT_FOUND' || error.notFound) {
          // No existing chain, create genesis
          console.log('🌱 Creating genesis block...');
          const genesisBlock = await this.createGenesisBlock();
          this.chain = [genesisBlock];
          await this.saveChain();
          console.log('✅ Genesis block created');
        } else {
          throw error;
        }
      }
  
      // Start block production if validator
      if (this.mode === 'validator') {
        console.log('⚡ Validator mode - block production will start');
      }
  
      console.log('✅ Blockchain initialization complete');
      console.log(`📊 Current height: ${this.chain.length}`);
  
    } catch (error) {
      console.error('❌ Error initializing blockchain:', error);
      throw error;
    }
  }

  createGenesisBlock() {
    const transactions = [];

    for (const [address, amount] of Object.entries(this.config.genesisAllocations)) {
      const tx = new Transaction('GENESIS', { to: address, amount });
      transactions.push(tx);
    }

    for (const [address, amount] of Object.entries(this.config.genesisStakes)) {
      const tx = new Transaction('STAKE', { from: address, amount });
      transactions.push(tx);
    }

    const genesisBlock = new Block(0, transactions, '0', 'genesis');
    genesisBlock.chainId = this.chainId;
    this.chain.push(genesisBlock);

    this.applyBlock(genesisBlock);
  }

  replayState() {
    this.state.clear();

    for (const block of this.chain) {
      this.applyBlock(block);
    }
  }

  applyBlock(block) {
    for (const tx of block.transactions) {
      this.applyTransaction(tx, block.index);
    }
  }

  applyTransaction(tx, blockIndex) {
    try {
      // Increment nonce for user transactions
      if (tx.type !== 'GENESIS' && tx.type !== 'REWARD' && tx.type !== 'REWARD_FEE' && tx.type !== 'SLASH') {
        this.state.incrementNonce(tx.data.from);
      }

      switch (tx.type) {
        case 'GENESIS':
          this.state.addBalance(tx.data.to, tx.data.amount);
          break;

        case 'TRANSFER':
          // Deduct gas cost
          const transferGasCost = tx.gasUsed * tx.gasPrice;
          this.state.subtractBalance(tx.data.from, tx.data.amount + transferGasCost);
          this.state.addBalance(tx.data.to, tx.data.amount);
          break;

        case 'STAKE':
          const stakeGasCost = tx.gasUsed * tx.gasPrice;
          this.state.subtractBalance(tx.data.from, tx.data.amount + stakeGasCost);
          this.state.addStake(tx.data.from, tx.data.amount);
          this.state.resetMissedBlocks(tx.data.from);
          break;

        case 'UNSTAKE':
          const unstakeGasCost = tx.gasUsed * tx.gasPrice;
          this.state.subtractBalance(tx.data.from, unstakeGasCost);
          const stakeAmount = this.state.getStake(tx.data.from);
          const unlockBlock = blockIndex + this.config.unstakeDelay;
          this.state.setStake(tx.data.from, 0);
          this.state.initiateUnstake(tx.data.from, unlockBlock);
          break;

        case 'REWARD':
          this.state.addBalance(tx.data.to, tx.data.amount);
          break;

        case 'REWARD_FEE':
          this.state.addBalance(tx.data.to, tx.data.amount);
          break;

        case 'CONTRACT_DEPLOY':
          const deployGasCost = tx.gasUsed * tx.gasPrice;
          this.state.subtractBalance(tx.data.from, deployGasCost);
          // Contract already deployed during execution
          break;

        case 'CONTRACT_CALL':
          const callGasCost = tx.gasUsed * tx.gasPrice;
          this.state.subtractBalance(tx.data.from, callGasCost);
          // Contract already executed
          break;

        case 'SLASH':
          this.state.subtractStake(tx.data.validator, tx.data.amount);
          this.state.resetMissedBlocks(tx.data.validator);
          break;
      }
    } catch (error) {
      console.error(`Error applying transaction ${tx.id}: ${error.message}`);
    }
  }

  addTransaction(tx, publicKey) {
    // Anti-spam: Check mempool size
    if (this.mempool.length >= this.mempoolLimit) {
      throw new Error('Mempool full. Try again later.');
    }

    // Anti-spam: Rate limit per address
    this.cleanupRateLimit();
    const addressCount = this.addressTxCount.get(tx.data.from) || 0;
    if (addressCount >= 10) { // Max 10 tx per minute per address
      throw new Error('Rate limit exceeded. Please wait.');
    }

    // Store public key
    if (tx.data.from) {
      this.state.setPublicKey(tx.data.from, publicKey);
    }

    // Validate signature
    if (!tx.isValid(this.state.publicKeys)) {
      throw new Error('Invalid transaction signature');
    }

    // Validate nonce
    const expectedNonce = this.state.getNonce(tx.data.from);
    if (tx.nonce !== expectedNonce) {
      throw new Error(`Invalid nonce. Expected: ${expectedNonce}, Got: ${tx.nonce}`);
    }

    // Validate gas parameters
    this.gas.validateGasParams(tx);

    // Calculate minimum gas
    const minGas = this.gas.calculateTransactionGas(tx);
    if (tx.gasLimit < minGas) {
      throw new Error(`Gas limit too low. Minimum: ${minGas}`);
    }

    // Check balance covers gas cost
    const maxGasCost = tx.gasLimit * tx.gasPrice;
    
    switch (tx.type) {
      case 'TRANSFER':
        if (this.state.getBalance(tx.data.from) < (tx.data.amount + maxGasCost)) {
          throw new Error('Insufficient balance for transfer + gas');
        }
        break;

      case 'STAKE':
        if (this.state.getBalance(tx.data.from) < (tx.data.amount + maxGasCost)) {
          throw new Error('Insufficient balance for staking + gas');
        }
        if (tx.data.amount < this.config.minStake) {
          throw new Error(`Minimum stake is ${this.config.minStake} SAYM`);
        }
        break;

      case 'UNSTAKE':
        if (this.state.getBalance(tx.data.from) < maxGasCost) {
          throw new Error('Insufficient balance for gas');
        }
        if (this.state.getStake(tx.data.from) === 0) {
          throw new Error('No stake to unstake');
        }
        if (this.state.isUnstaking(tx.data.from)) {
          throw new Error('Already unstaking');
        }
        break;

      case 'CONTRACT_DEPLOY':
      case 'CONTRACT_CALL':
        if (this.state.getBalance(tx.data.from) < maxGasCost) {
          throw new Error('Insufficient balance for gas');
        }
        break;
    }

    // Add to mempool
    this.mempool.push(tx);

    // Update rate limit counter
    this.addressTxCount.set(tx.data.from, addressCount + 1);
  }

  cleanupRateLimit() {
    const now = Date.now();
    if (now - this.lastCleanup > 60000) { // Every minute
      this.addressTxCount.clear();
      this.lastCleanup = now;
    }
  }

  async createBlock() {
    if (this.isProducing) {
      return null;
    }

    this.isProducing = true;

    try {
      const lastBlock = this.getLastBlock();
      const validator = this.pos.selectValidator(lastBlock.hash);

      if (!validator) {
        this.isProducing = false;
        return null;
      }

      const transactions = [];
      let blockGasUsed = 0;

      // Process mempool transactions
      for (const tx of this.mempool) {
        try {
          // Execute transaction to calculate actual gas
          const gasTracker = this.gas.trackExecution();
          
          if (tx.type === 'CONTRACT_DEPLOY') {
            this.contracts.deploy(tx.data.from, tx.data.code, tx.timestamp, gasTracker);
          } else if (tx.type === 'CONTRACT_CALL') {
            this.contracts.call(
              tx.data.from,
              tx.data.contractAddress,
              tx.data.method,
              tx.data.args,
              gasTracker,
              tx.gasLimit
            );
          } else {
            // Simple transactions
            const minGas = this.gas.calculateTransactionGas(tx);
            gasTracker.gasUsed = minGas;
          }

          // Check if exceeds block gas limit
          if (blockGasUsed + gasTracker.gasUsed > this.gas.limits.maxGasPerBlock) {
            continue; // Skip this tx, try next
          }

          tx.gasUsed = gasTracker.gasUsed;
          transactions.push(tx);
          blockGasUsed += gasTracker.gasUsed;

          // Create gas fee reward for validator
          const gasFee = tx.gasUsed * tx.gasPrice;
          if (gasFee > 0) {
            const feeReward = Transaction.createRewardFee(validator, gasFee);
            transactions.push(feeReward);
          }

        } catch (error) {
          console.log(`⚠ Transaction ${tx.id.substring(0, 8)} failed: ${error.message}`);
          // Skip failed transaction
        }
      }

      // Clear processed transactions from mempool
      this.mempool = [];

      // Add block reward
      const rewardTx = Transaction.createReward(validator, this.config.blockReward);
      transactions.push(rewardTx);

      // Check for slashing
      const slashEvents = this.pos.checkSlashing(this.config);
      for (const slash of slashEvents) {
        const slashTx = Transaction.createSlash(
          slash.validator,
          slash.amount,
          slash.reason
        );
        transactions.push(slashTx);
      }

      // Create block
      const block = new Block(
        this.chain.length,
        transactions,
        lastBlock.hash,
        validator
      );
      
      block.chainId = this.chainId;
      block.gasUsed = blockGasUsed;

      // Apply block to state
      this.applyBlock(block);

      // Add to chain
      this.chain.push(block);

      // Reset missed blocks for validator
      this.state.resetMissedBlocks(validator);

      // Save
      await this.saveChain();

      console.log(`✅ Block #${block.index} | Validator: ${validator.substring(0, 8)}... | Txs: ${block.transactions.length} | Gas: ${blockGasUsed} | Reward: ${this.config.blockReward} SAYM`);

      this.isProducing = false;
      return block;

    } catch (error) {
      console.error('Error creating block:', error);
      this.isProducing = false;
      return null;
    }
  }

  async replaceChain(newChain) {
    if (newChain.length <= this.chain.length) {
      return false;
    }

    if (newChain[0].chainId && newChain[0].chainId !== this.chainId) {
      console.log(`❌ Rejecting chain from different network (${newChain[0].chainId})`);
      return false;
    }

    if (!this.isValidChain(newChain)) {
      console.log('✗ Received invalid chain');
      return false;
    }

    console.log(`📥 Replacing chain (${this.chain.length} -> ${newChain.length} blocks)`);
    
    this.chain = newChain;
    this.replayState();
    await this.saveChain();

    console.log('✓ Chain replaced and state rebuilt');
    return true;
  }

  isValidChain(chain) {
    if (chain.length === 0) return false;

    for (let i = 1; i < chain.length; i++) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      // Validate gas limits
      if (currentBlock.gasUsed > this.gas.limits.maxGasPerBlock) {
        return false;
      }
    }

    return true;
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  async saveChain() {
    const chainData = this.chain.map(block => block.toJSON());
    await this.db.put('chain', chainData);
  }

  getStats() {
    const validators = this.state.getValidators();
    const totalRewards = validators.reduce((sum, v) => sum + (v.totalRewards || 0), 0);
    
    return {
      network: this.config.networkName,
      chainId: this.chainId,
      blocks: this.chain.length,
      validators: validators.length,
      totalStake: this.state.getTotalStake(),
      mempool: this.mempool.length,
      contracts: this.state.getAllContracts().length,
      blockReward: this.config.blockReward,
      blockTime: this.config.blockTime,
      totalRewards: totalRewards,
      gasLimits: this.gas.limits,
      gasCosts: this.gas.gasCosts
    };
  }

  printStats() {
    const stats = this.getStats();
    console.log('\n📊 Blockchain Stats:');
    console.log(`   Network: ${stats.network}`);
    console.log(`   Chain ID: ${stats.chainId}`);
    console.log(`   Blocks: ${stats.blocks}`);
    console.log(`   Validators: ${stats.validators}`);
    console.log(`   Total Stake: ${stats.totalStake} SAYM`);
    console.log(`   Mempool: ${stats.mempool}`);
    console.log(`   Contracts: ${stats.contracts}`);
    console.log(`   Min Gas Price: ${this.gas.limits.minGasPrice}\n`);
  }

  async close() {
    await this.db.close();
  }
}

export default Blockchain;