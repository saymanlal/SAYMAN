// core/block.js
import crypto from 'crypto';
import Transaction from './transaction.js';

class Block {
  constructor(index, transactions, previousHash, validator, stakeWeight) {
    this.index = index;
    this.timestamp = Date.now();
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.validator = validator;
    this.stakeWeight = stakeWeight;
    this.hash = this.calculateHash();
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(
        this.index +
        this.timestamp +
        JSON.stringify(this.transactions) +
        this.previousHash +
        this.validator +
        this.stakeWeight
      )
      .digest('hex');
  }

  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      transactions: this.transactions.map(tx => tx.toJSON()),
      previousHash: this.previousHash,
      validator: this.validator,
      stakeWeight: this.stakeWeight,
      hash: this.hash
    };
  }

  static fromJSON(data) {
    const transactions = data.transactions.map(tx => Transaction.fromJSON(tx));
    const block = new Block(
      data.index,
      transactions,
      data.previousHash,
      data.validator,
      data.stakeWeight
    );
    block.timestamp = data.timestamp;
    block.hash = data.hash;
    return block;
  }
}

export default Block;