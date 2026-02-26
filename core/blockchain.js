import Block from './block.js';
import Transaction from './transaction.js';
import StateEngine from './state.js';
import ProofOfStake from './pos.js';
import ContractEngine from './contracts.js';
import { Level } from 'level';

class Blockchain {
  constructor(config) {
    this.config = config;
    this.chain = [];
    this.mempool = [];
    this.state = new StateEngine();
    this.pos = new ProofOfStake(this.state, config);
    this.contracts = new ContractEngine(this.state);
    this.db = new Level(`./data/blockchain_${config.p2pPort}`, { valueEncoding: 'json' });
    this.isProducing = false;
  }

  async initialize() {
    try {
      const savedChain = await this.db.get('chain');
      
      if (savedChain && savedChain.length > 0) {
        console.log(`📦 Loading ${savedChain.length} blocks from storage...`);
        
        // Load blocks
        for (const blockData of savedChain) {
          const block = await Block.fromJSON(blockData);
          this.chain.push(block);
        }

        // Replay state from genesis
        console.log('🔄 Replaying state from genesis...');
        this.replayState();
        
        console.log('✓ Blockchain loaded and state rebuilt');
      } else {
        console.log('🎬 Creating genesis block...');
        this.createGenesisBlock();
        await this.saveChain();
      }

      this.printStats();
    } catch (error) {
      if (error.code === 'LEVEL_NOT_FOUND') {
        console.log('🎬 Creating genesis block...');
        this.createGenesisBlock();
        await this.saveChain();
        this.printStats();
      } else {
        throw error;
      }
    }
  }

  createGenesisBlock() {
    const transactions = [];

    // Genesis allocations
    for (const [address, amount] of Object.entries(this.config.genesisAllocations)) {
      const tx = new Transaction('GENESIS', { to: address, amount });
      transactions.push(tx);
    }

    // Genesis stakes
    for (const [address, amount] of Object.entries(this.config.genesisStakes)) {
      const tx = new Transaction('STAKE', { from: address, amount });
      transactions.push(tx);
    }

    const genesisBlock = new Block(0, transactions, '0', 'genesis');
    this.chain.push(genesisBlock);

    // Apply genesis state
    this.applyBlock(genesisBlock);
  }

  replayState() {
    // Clear all state
    this.state.clear();

    // Replay all blocks from genesis
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
      switch (tx.type) {
        case 'GENESIS':
          this.state.addBalance(tx.data.to, tx.data.amount);
          break;

        case 'TRANSFER':
          this.state.subtractBalance(tx.data.from, tx.data.amount);
          this.state.addBalance(tx.data.to, tx.data.amount);
          break;

        case 'STAKE':
          this.state.subtractBalance(tx.data.from, tx.data.amount);
          this.state.addStake(tx.data.from, tx.data.amount);
          this.state.resetMissedBlocks(tx.data.from);
          break;

        case 'UNSTAKE':
          const stakeAmount = this.state.getStake(tx.data.from);
          const unlockBlock = blockIndex + this.config.unstakeDelay;
          this.state.setStake(tx.data.from, 0);
          this.state.initiateUnstake(tx.data.from, unlockBlock);
          // Funds locked until unlockBlock
          break;

        case 'REWARD':
          this.state.addBalance(tx.data.to, tx.data.amount);
          break;

        case 'CONTRACT_DEPLOY':
          this.contracts.deploy(tx.data.from, tx.data.code, tx.timestamp);
          break;

        case 'CONTRACT_CALL':
          this.contracts.call(
            tx.data.from,
            tx.data.contractAddress,
            tx.data.method,
            tx.data.args
          );
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
    // Store public key
    if (tx.data.from) {
      this.state.setPublicKey(tx.data.from, publicKey);
    }

    // Validate signature
    if (!tx.isValid(this.state.publicKeys)) {
      throw new Error('Invalid transaction signature');
    }

    // Validate based on type
    switch (tx.type) {
      case 'TRANSFER':
        if (this.state.getBalance(tx.data.from) < tx.data.amount) {
          throw new Error('Insufficient balance');
        }
        break;

      case 'STAKE':
        if (this.state.getBalance(tx.data.from) < tx.data.amount) {
          throw new Error('Insufficient balance for staking');
        }
        if (tx.data.amount < this.config.minStake) {
          throw new Error(`Minimum stake is ${this.config.minStake} SAYM`);
        }
        break;

      case 'UNSTAKE':
        if (this.state.getStake(tx.data.from) === 0) {
          throw new Error('No stake to unstake');
        }
        if (this.state.isUnstaking(tx.data.from)) {
          throw new Error('Already unstaking');
        }
        break;
    }

    // Add to mempool
    this.mempool.push(tx);
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
        console.log('⚠ No validators available');
        this.isProducing = false;
        return null;
      }

      // Get pending transactions
      const transactions = [...this.mempool];
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

      // Apply block to state
      this.applyBlock(block);

      // Add to chain
      this.chain.push(block);

      // Reset missed blocks for validator
      this.state.resetMissedBlocks(validator);

      // Save
      await this.saveChain();

      console.log(`✓ Block #${block.index} created by ${validator.substring(0, 8)}...`);
      console.log(`  Transactions: ${block.transactions.length}`);
      console.log(`  Hash: ${block.hash.substring(0, 16)}...`);

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
    return {
      blocks: this.chain.length,
      validators: this.state.getValidators().length,
      totalStake: this.state.getTotalStake(),
      mempool: this.mempool.length,
      contracts: this.state.getAllContracts().length
    };
  }

  printStats() {
    const stats = this.getStats();
    console.log('\n📊 Blockchain Stats:');
    console.log(`   Blocks: ${stats.blocks}`);
    console.log(`   Validators: ${stats.validators}`);
    console.log(`   Total Stake: ${stats.totalStake} SAYM`);
    console.log(`   Mempool: ${stats.mempool}`);
    console.log(`   Contracts: ${stats.contracts}\n`);
  }

  async close() {
    await this.db.close();
  }
}

export default Blockchain;