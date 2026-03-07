class StateEngine {
  constructor() {
    this.balances = new Map();
    this.stakes = new Map();
    this.publicKeys = new Map();
    this.nonces = new Map();
  }

  // Balance methods
  getBalance(address) {
    return this.balances.get(address) || 0;
  }

  addBalance(address, amount) {
    const currentBalance = this.getBalance(address);
    this.balances.set(address, currentBalance + amount);
  }

  subtractBalance(address, amount) {
    const currentBalance = this.getBalance(address);
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }
    this.balances.set(address, currentBalance - amount);
  }

  transfer(from, to, amount) {
    this.subtractBalance(from, amount);
    this.addBalance(to, amount);
  }

  // Stake methods
  getStake(address) {
    return this.stakes.get(address) || 0;
  }

  stake(address, amount) {
    this.subtractBalance(address, amount);
    const currentStake = this.getStake(address);
    this.stakes.set(address, currentStake + amount);
  }

  unstake(address) {
    const stakedAmount = this.getStake(address);
    if (stakedAmount > 0) {
      this.stakes.set(address, 0);
      this.addBalance(address, stakedAmount);
    }
  }

  slash(address, amount) {
    const currentStake = this.getStake(address);
    const slashAmount = Math.min(amount, currentStake);
    this.stakes.set(address, currentStake - slashAmount);
  }

  // Public key management
  setPublicKey(address, publicKey) {
    this.publicKeys.set(address, publicKey);
  }

  getPublicKey(address) {
    return this.publicKeys.get(address);
  }

  // Nonce methods
  getNonce(address) {
    return this.nonces.get(address) || 0;
  }

  incrementNonce(address) {
    const currentNonce = this.getNonce(address);
    this.nonces.set(address, currentNonce + 1);
  }

  validateNonce(address, nonce) {
    const expectedNonce = this.getNonce(address);
    return nonce === expectedNonce;
  }

  resetNonces() {
    this.nonces.clear();
  }

  // Serialization
  toJSON() {
    return {
      balances: Array.from(this.balances.entries()),
      stakes: Array.from(this.stakes.entries()),
      publicKeys: Array.from(this.publicKeys.entries()),
      nonces: Array.from(this.nonces.entries())
    };
  }

  fromJSON(data) {
    this.balances = new Map(data.balances || []);
    this.stakes = new Map(data.stakes || []);
    this.publicKeys = new Map(data.publicKeys || []);
    this.nonces = new Map(data.nonces || []);
  }

  getAllBalances() {
    return Object.fromEntries(this.balances);
  }

  getAllStakes() {
    return Object.fromEntries(this.stakes);
  }
}

export default StateEngine;
```

## Update Environment Variables in Render

### For SAYMAN service (main blockchain):

Go to Render Dashboard → **SAYMAN** service → **Environment**

Add/Update these variables:
```
NODE_ENV = production
PORT = 10000
```

### For sayman-faucet service:

Go to Render Dashboard → **sayman-faucet** service → **Environment**

Add/Update these variables:
```
API_BASE = https://sayman.onrender.com/api
FAUCET_PORT = 10000
FAUCET_AMOUNT = 100