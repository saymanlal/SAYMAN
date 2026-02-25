import Block from './block.js';
import Transaction from './transaction.js';
import StakeManager from './stake.js';
import ProofOfStake from './pos.js';
import RewardSystem from './rewards.js';
import SlashingSystem from './slashing.js';

class Blockchain {
  constructor(config, db) {
    this.config = config;
    this.db = db;
    this.chain = [];
    this.mempool = [];
    this.balances = new Map();
    this.publicKeys = new Map();
    this.stakeManager = new StakeManager(config);
    this.pos = new ProofOfStake(this.stakeManager);
    this.rewardSystem = new RewardSystem(config);
    this.slashingSystem = new SlashingSystem(config);
  }

  async initialize() {
    const savedChain = await this.db.getChain();
    
    if (savedChain && savedChain.length > 0) {
      this.chain = savedChain;
      await this.rebuildState();
      console.log(`✓ Loaded ${this.chain.length} blocks from storage`);
    } else {
      this.createGenesisBlock();
      await this.saveChain();
      console.log('✓ Created genesis block');
    }
  }

  createGenesisBlock() {
    const genesisTx = new Transaction(
      'system',
      this.config.genesisValidator,
      this.config.initialSupply,
      'genesis'
    );

    const genesisBlock = new Block(
      0,
      [genesisTx],
      '0',
      this.config.genesisValidator,
      0
    );

    this.chain.push(genesisBlock);
    this.balances.set(this.config.genesisValidator, this.config.initialSupply);
    
    // Add initial stake for genesis validator
    this.stakeManager.addValidator(
      this.config.genesisValidator,
      this.config.minimumStake * 10
    );
  }

  async rebuildState() {
    this.balances.clear();
    this.publicKeys.clear();
    this.stakeManager = new StakeManager(this.config);
    this.pos = new ProofOfStake(this.stakeManager);

    for (const block of this.chain) {
      for (const tx of block.transactions) {
        this.applyTransaction(tx);
      }
    }
    
    // Re-add genesis stake
    if (this.chain.length > 0) {
      const genesisBalance = this.balances.get(this.config.genesisValidator);
      if (genesisBalance >= this.config.minimumStake * 10) {
        this.stakeManager.addValidator(
          this.config.genesisValidator,
          this.config.minimumStake * 10
        );
      }
    }
  }

  applyTransaction(tx) {
    if (tx.from === 'system') {
      this.balances.set(tx.to, (this.balances.get(tx.to) || 0) + tx.amount);
      return;
    }

    const fromBalance = this.balances.get(tx.from) || 0;
    const toBalance = this.balances.get(tx.to) || 0;

    this.balances.set(tx.from, fromBalance - tx.amount);
    this.balances.set(tx.to, toBalance + tx.amount);
  }

  getBalance(address) {
    return this.balances.get(address) || 0;
  }

  addTransaction(tx, publicKey) {
    // Store public key first
    this.publicKeys.set(tx.from, publicKey);
    
    if (!tx.isValid((addr) => this.publicKeys.get(addr))) {
      throw new Error('Invalid transaction signature');
    }
  
    if (tx.from !== 'system') {
      const balance = this.getBalance(tx.from);
      if (balance < tx.amount) {
        throw new Error('Insufficient balance');
      }
    }
  
    this.mempool.push(tx);
  }

  addStake(address, amount, publicKey) {
    const balance = this.getBalance(address);
    
    if (balance < amount) {
      throw new Error('Insufficient balance for staking');
    }

    this.publicKeys.set(address, publicKey);
    const validator = this.stakeManager.addValidator(address, amount);
    this.balances.set(address, balance - amount);

    return validator;
  }

  unstake(address) {
    const currentBlock = this.chain.length;
    const unlockBlock = this.stakeManager.initiateUnstake(address, currentBlock);
    return unlockBlock;
  }

  withdrawStake(address) {
    const currentBlock = this.chain.length;
    const amount = this.stakeManager.withdrawStake(address, currentBlock);
    const balance = this.getBalance(address);
    this.balances.set(address, balance + amount);
    return amount;
  }

  async createBlock() {
    if (this.mempool.length === 0) {
      return null;
    }

    const lastBlock = this.getLastBlock();
    const validator = this.pos.selectValidator(lastBlock.hash);

    if (!validator) {
      console.log('⚠ No validators available');
      return null;
    }

    const transactions = [...this.mempool];
    this.mempool = [];

    const block = new Block(
      this.chain.length,
      transactions,
      lastBlock.hash,
      validator,
      this.pos.getValidatorWeight(validator)
    );

    this.chain.push(block);

    // Apply transactions
    for (const tx of transactions) {
      this.applyTransaction(tx);
    }

    // Reward validator
    const validatorObj = this.stakeManager.getValidator(validator);
    if (validatorObj) {
      const reward = this.rewardSystem.distributeReward(validatorObj, block.index);
      const balance = this.getBalance(validator);
      this.balances.set(validator, balance + reward);
      this.pos.recordBlockCreation(validator);
    }

    // Check for slashing
    const slashResults = this.slashingSystem.checkAndSlashInactiveValidators(
      this.stakeManager.getAllValidators()
    );

    if (slashResults.length > 0) {
      console.log(`⚠ Slashed ${slashResults.length} validator(s)`);
    }

    await this.saveChain();
    return block;
  }

  getLastBlock() {
    return this.chain[this.chain.length - 1];
  }

  isValid() {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  async saveChain() {
    await this.db.saveChain(this.chain);
  }

  getChain() {
    return this.chain.map(block => block.toJSON());
  }

  getValidators() {
    return this.stakeManager.getActiveValidators().map(v => v.toJSON());
  }

  getAllValidators() {
    return this.stakeManager.getAllValidators().map(v => v.toJSON());
  }

  getMempoolSize() {
    return this.mempool.length;
  }

  faucet(address) {
    if (!this.config.faucetEnabled) {
      throw new Error('Faucet not enabled on this network');
    }

    const faucetTx = new Transaction(
      'system',
      address,
      this.config.faucetAmount,
      'faucet'
    );

    this.mempool.push(faucetTx);
    return faucetTx;
  }

  getStats() {
    return {
      blocks: this.chain.length,
      validators: this.stakeManager.getActiveValidators().length,
      totalValidators: this.stakeManager.getAllValidators().length,
      totalStake: this.stakeManager.getTotalStake(),
      mempool: this.mempool.length,
      totalRewards: this.rewardSystem.getTotalRewardsDistributed(
        this.stakeManager.getAllValidators()
      )
    };
  }
}

export default Blockchain;