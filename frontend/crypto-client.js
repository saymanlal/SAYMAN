// Client-side cryptography using browser's SubtleCrypto and elliptic via CDN
class SaymanWallet {
    constructor(privateKey = null) {
      this.ec = null;
      this.keyPair = null;
      this.privateKey = privateKey;
      this.publicKey = null;
      this.address = null;
    }
  
    async initialize() {
      // Wait for elliptic to load from CDN
      await this.waitForElliptic();
      
      if (this.privateKey) {
        // Import existing key
        this.keyPair = this.ec.keyFromPrivate(this.privateKey, 'hex');
      } else {
        // Generate new key
        this.keyPair = this.ec.genKeyPair();
        this.privateKey = this.keyPair.getPrivate('hex');
      }
      
      this.publicKey = this.keyPair.getPublic('hex');
      this.address = await this.deriveAddress(this.publicKey);
      
      return this;
    }
  
    async waitForElliptic() {
      // Wait for elliptic library to be available
      while (typeof elliptic === 'undefined') {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      this.ec = new elliptic.ec('secp256k1');
    }
  
    async deriveAddress(publicKey) {
      // Use SubtleCrypto for SHA-256 (browser native)
      const encoder = new TextEncoder();
      const data = encoder.encode(publicKey);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex.substring(0, 40);
    }
  
    async signTransaction(txData) {
      // Calculate transaction hash
      const txString = JSON.stringify({
        type: txData.type,
        data: txData.data,
        timestamp: txData.timestamp
      });
      
      const encoder = new TextEncoder();
      const data = encoder.encode(txString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Sign with private key
      const signature = this.keyPair.sign(hash);
      return signature.toDER('hex');
    }
  
    export() {
      return {
        address: this.address,
        publicKey: this.publicKey,
        privateKey: this.privateKey
      };
    }
  }
  
  // Export for use in app.js
  window.SaymanWallet = SaymanWallet;