import pkg from 'elliptic';
const { ec: EC } = pkg;
import crypto from 'crypto';

const ec = new EC('secp256k1');

class Wallet {
  constructor(privateKey = null) {
    if (privateKey) {
      this.keyPair = ec.keyFromPrivate(privateKey, 'hex');
    } else {
      this.keyPair = ec.genKeyPair();
    }
    
    this.publicKey = this.keyPair.getPublic('hex');
    this.privateKey = this.keyPair.getPrivate('hex');
    this.address = this.generateAddress(this.publicKey);
  }

  generateAddress(publicKey) {
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    return hash.substring(0, 40);
  }

  sign(dataHash) {
    const signature = this.keyPair.sign(dataHash);
    return signature.toDER('hex');
  }

  static verifySignature(publicKey, signature, dataHash) {
    try {
      const key = ec.keyFromPublic(publicKey, 'hex');
      return key.verify(dataHash, signature);
    } catch (error) {
      return false;
    }
  }

  export() {
    return {
      address: this.address,
      publicKey: this.publicKey,
      privateKey: this.privateKey
    };
  }

  static import(privateKey) {
    return new Wallet(privateKey);
  }
}

export default Wallet;