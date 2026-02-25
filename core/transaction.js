import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Wallet from './wallet.js';

class Transaction {
  constructor(from, to, amount, signature = null) {
    this.id = uuidv4();
    this.from = from;
    this.to = to;
    this.amount = amount;
    this.timestamp = Date.now();
    this.signature = signature;
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(this.from + this.to + this.amount + this.timestamp)
      .digest('hex');
  }

  sign(wallet) {
    if (wallet.getAddress() !== this.from) {
      throw new Error('Cannot sign transaction for other wallets');
    }
    const hash = this.calculateHash();
    this.signature = wallet.sign(hash);
  }

  isValid(getPublicKey) {
    if (this.from === 'system') {
      return true;
    }

    if (!this.signature || this.signature.length === 0) {
      return false;
    }

    const publicKey = getPublicKey(this.from);
    if (!publicKey) {
      return false;
    }

    const hash = this.calculateHash();
    return Wallet.verifySignature(publicKey, this.signature, hash);
  }

  toJSON() {
    return {
      id: this.id,
      from: this.from,
      to: this.to,
      amount: this.amount,
      timestamp: this.timestamp,
      signature: this.signature
    };
  }

  static fromJSON(data) {
    const tx = new Transaction(data.from, data.to, data.amount, data.signature);
    tx.id = data.id;
    tx.timestamp = data.timestamp;
    return tx;
  }
}

export default Transaction;