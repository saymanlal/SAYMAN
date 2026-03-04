// Browser crypto doesn't work in Node.js, so we use native crypto
import crypto from 'crypto';
import elliptic from 'elliptic';

const EC = elliptic.ec;
const ec = new EC('secp256k1');

export class SaymanWalletCLI {
  constructor(privateKey = null) {
    this.keyPair = null;
    this.privateKey = privateKey;
    this.publicKey = null;
    this.address = null;
  }

  async initialize() {
    if (this.privateKey) {
      this.keyPair = ec.keyFromPrivate(this.privateKey, 'hex');
    } else {
      this.keyPair = ec.genKeyPair();
      this.privateKey = this.keyPair.getPrivate('hex');
    }

    this.publicKey = this.keyPair.getPublic('hex');
    this.address = this.deriveAddress(this.publicKey);

    return this;
  }

  deriveAddress(publicKey) {
    const hash = crypto.createHash('sha256').update(publicKey).digest('hex');
    return hash.substring(0, 40);
  }

  async signTransaction(txData) {
    const txString = JSON.stringify({
      type: txData.type,
      timestamp: txData.timestamp,
      data: txData.data
    });

    const hash = crypto.createHash('sha256').update(txString).digest('hex');
    const sig = this.keyPair.sign(hash);

    return {
      r: sig.r.toString('hex'),
      s: sig.s.toString('hex')
    };
  }

  export() {
    return {
      address: this.address,
      publicKey: this.publicKey,
      privateKey: this.privateKey
    };
  }
}