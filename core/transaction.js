import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import Wallet from '../wallet/wallet.js';

class Transaction {
  constructor(type, data) {
    this.id = uuidv4();
    this.type = type; // GENESIS, TRANSFER, STAKE, UNSTAKE, REWARD, CONTRACT_DEPLOY, CONTRACT_CALL, SLASH
    this.timestamp = Date.now();
    this.data = data;
    this.signature = null;
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({
        type: this.type,
        timestamp: this.timestamp,
        data: this.data
      }))
      .digest('hex');
  }

  sign(wallet) {
    const hash = this.calculateHash();
    this.signature = wallet.sign(hash);
  }

  isValid(publicKeys) {
    // System transactions don't need signatures
    if (this.type === 'GENESIS' || this.type === 'REWARD' || this.type === 'SLASH') {
      return true;
    }

    if (!this.signature) {
      return false;
    }

    const publicKey = publicKeys.get(this.data.from);
    if (!publicKey) {
      return false;
    }

    const hash = this.calculateHash();
    return Wallet.verifySignature(publicKey, this.signature, hash);
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      data: this.data,
      signature: this.signature
    };
  }

  static fromJSON(json) {
    const tx = new Transaction(json.type, json.data);
    tx.id = json.id;
    tx.timestamp = json.timestamp;
    tx.signature = json.signature;
    return tx;
  }

  // Factory methods
  static createTransfer(from, to, amount) {
    return new Transaction('TRANSFER', { from, to, amount });
  }

  static createStake(from, amount) {
    return new Transaction('STAKE', { from, amount });
  }

  static createUnstake(from) {
    return new Transaction('UNSTAKE', { from });
  }

  static createReward(to, amount) {
    return new Transaction('REWARD', { to, amount });
  }

  static createContractDeploy(from, code) {
    return new Transaction('CONTRACT_DEPLOY', { from, code });
  }

  static createContractCall(from, contractAddress, method, args) {
    return new Transaction('CONTRACT_CALL', { from, contractAddress, method, args });
  }

  static createSlash(validator, amount, reason) {
    return new Transaction('SLASH', { validator, amount, reason });
  }
}

export default Transaction;