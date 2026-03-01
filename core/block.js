import crypto from 'crypto';
import Transaction from './transaction.js';

class Block {
  constructor(index, transactions, previousHash, validator) {
    this.index = index;
    this.timestamp = Date.now();
    this.transactions = transactions;
    this.previousHash = previousHash;
    this.validator = validator;
    this.chainId = null;
    this.gasUsed = 0;
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
        (this.chainId || '') +
        this.gasUsed
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
      chainId: this.chainId,
      gasUsed: this.gasUsed,
      hash: this.hash
    };
  }

  static async fromJSON(data) {
    const Transaction = (await import('./transaction.js')).default;
    const transactions = data.transactions.map(tx => Transaction.fromJSON(tx));
    const block = new Block(
      data.index,
      transactions,
      data.previousHash,
      data.validator
    );
    block.timestamp = data.timestamp;
    block.chainId = data.chainId;
    block.gasUsed = data.gasUsed || 0;
    block.hash = data.hash;
    return block;
  }
}

export default Block;