class NonceManager {
    constructor() {
      this.nonces = new Map(); // address -> nonce
    }
  
    getNonce(address) {
      return this.nonces.get(address) || 0;
    }
  
    setNonce(address, nonce) {
      this.nonces.set(address, nonce);
    }
  
    incrementNonce(address) {
      const current = this.getNonce(address);
      this.setNonce(address, current + 1);
      return current + 1;
    }
  
    validateNonce(address, nonce) {
      const expected = this.getNonce(address);
      
      if (nonce !== expected) {
        throw new Error(`Invalid nonce. Expected: ${expected}, Got: ${nonce}`);
      }
      
      return true;
    }
  
    reset() {
      this.nonces.clear();
    }
  
    toJSON() {
      return Array.from(this.nonces.entries());
    }
  
    fromJSON(data) {
      this.nonces = new Map(data || []);
    }
  }
  
  export default NonceManager;