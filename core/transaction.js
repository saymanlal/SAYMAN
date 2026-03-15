import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import elliptic from 'elliptic';

const EC = elliptic.ec;
const ec = new EC('secp256k1');

class Transaction {
  constructor(type, data) {
    this.id = uuidv4();
    this.type = type;
    this.timestamp = Date.now();
    this.data = data;
    this.signature = null;
    this.gasLimit = 0;
    this.gasPrice = 0;
    this.nonce = 0;
    this.gasUsed = 0;
  }

  calculateHash() {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify({
        type: this.type,
        timestamp: this.timestamp,
        data: this.data,
        gasLimit: this.gasLimit,
        gasPrice: this.gasPrice,
        nonce: this.nonce
      }))
      .digest('hex');
  }

  sign(wallet) {
    const hash = this.calculateHash();
    this.signature = wallet.sign(hash);
  }

  isValid(publicKeys) {
    // System transactions don't need signatures or gas
    if (this.type === 'GENESIS' || this.type === 'REWARD' || this.type === 'REWARD_FEE' || this.type === 'SLASH') {
      return true;
    }

    if (!this.signature) {
      return false;
    }

    // Validate gas parameters
    if (!this.gasLimit || !this.gasPrice) {
      return false;
    }

    const publicKey = publicKeys.get(this.data.from);
    if (!publicKey) {
      return false;
    }

    // Verify signature using elliptic directly
    try {
      const key = ec.keyFromPublic(publicKey, 'hex');
      const msgHash = this.calculateHash();
      
      const isValid = key.verify(msgHash, this.signature);
      
      if (!isValid) {
        console.error(`❌ Signature verification failed for ${this.data.from}`);
      }
      
      return isValid;
    } catch (error) {
      console.error('Signature verification error:', error.message);
      return false;
    }
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      data: this.data,
      signature: this.signature,
      gasLimit: this.gasLimit,
      gasPrice: this.gasPrice,
      nonce: this.nonce,
      gasUsed: this.gasUsed
    };
  }

  static fromJSON(json) {
    const tx = new Transaction(json.type, json.data);
    tx.id = json.id;
    tx.timestamp = json.timestamp;
    tx.signature = json.signature;
    tx.gasLimit = json.gasLimit || 0;
    tx.gasPrice = json.gasPrice || 0;
    tx.nonce = json.nonce || 0;
    tx.gasUsed = json.gasUsed || 0;
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

  static createRewardFee(to, amount) {
    return new Transaction('REWARD_FEE', { to, amount });
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