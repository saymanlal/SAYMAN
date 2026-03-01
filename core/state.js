import NonceManager from './nonce.js';

class StateEngine {
  constructor() {
    this.balances = new Map();
    this.stakes = new Map();
    this.unstaking = new Map();
    this.publicKeys = new Map();
    this.contracts = new Map();
    this.validatorMissedBlocks = new Map();
    this.nonces = new NonceManager();
  }

  // Balances
  getBalance(address) {
    return this.balances.get(address) || 0;
  }

  setBalance(address, amount) {
    if (amount < 0) {
      throw new Error('Balance cannot be negative');
    }
    this.balances.set(address, amount);
  }

  addBalance(address, amount) {
    const current = this.getBalance(address);
    this.setBalance(address, current + amount);
  }

  subtractBalance(address, amount) {
    const current = this.getBalance(address);
    if (current < amount) {
      throw new Error('Insufficient balance');
    }
    this.setBalance(address, current - amount);
  }

  // Stakes
  getStake(address) {
    return this.stakes.get(address) || 0;
  }

  setStake(address, amount) {
    if (amount <= 0) {
      this.stakes.delete(address);
    } else {
      this.stakes.set(address, amount);
    }
  }

  addStake(address, amount) {
    const current = this.getStake(address);
    this.setStake(address, current + amount);
  }

  subtractStake(address, amount) {
    const current = this.getStake(address);
    this.setStake(address, Math.max(0, current - amount));
  }

  getTotalStake() {
    let total = 0;
    for (const stake of this.stakes.values()) {
      total += stake;
    }
    return total;
  }

  getValidators() {
    const validators = [];
    for (const [address, stake] of this.stakes.entries()) {
      if (stake > 0) {
        validators.push({
          address,
          stake,
          missedBlocks: this.validatorMissedBlocks.get(address) || 0
        });
      }
    }
    return validators.sort((a, b) => b.stake - a.stake);
  }

  // Unstaking
  initiateUnstake(address, unlockBlock) {
    this.unstaking.set(address, unlockBlock);
  }

  isUnstaking(address) {
    return this.unstaking.has(address);
  }

  getUnlockBlock(address) {
    return this.unstaking.get(address);
  }

  canWithdraw(address, currentBlock) {
    const unlockBlock = this.unstaking.get(address);
    return unlockBlock !== undefined && currentBlock >= unlockBlock;
  }

  completeUnstake(address) {
    this.unstaking.delete(address);
  }

  // Public Keys
  setPublicKey(address, publicKey) {
    this.publicKeys.set(address, publicKey);
  }

  getPublicKey(address) {
    return this.publicKeys.get(address);
  }

  // Contracts
  setContract(address, contract) {
    this.contracts.set(address, contract);
  }

  getContract(address) {
    return this.contracts.get(address);
  }

  getAllContracts() {
    return Array.from(this.contracts.values());
  }

  // Validator Tracking
  incrementMissedBlocks(address) {
    const current = this.validatorMissedBlocks.get(address) || 0;
    this.validatorMissedBlocks.set(address, current + 1);
  }

  resetMissedBlocks(address) {
    this.validatorMissedBlocks.set(address, 0);
  }

  getMissedBlocks(address) {
    return this.validatorMissedBlocks.get(address) || 0;
  }

  // Nonce Management
  getNonce(address) {
    return this.nonces.getNonce(address);
  }

  incrementNonce(address) {
    return this.nonces.incrementNonce(address);
  }

  validateNonce(address, nonce) {
    return this.nonces.validateNonce(address, nonce);
  }

  // State Snapshot
  toJSON() {
    return {
      balances: Array.from(this.balances.entries()),
      stakes: Array.from(this.stakes.entries()),
      unstaking: Array.from(this.unstaking.entries()),
      publicKeys: Array.from(this.publicKeys.entries()),
      contracts: Array.from(this.contracts.entries()),
      validatorMissedBlocks: Array.from(this.validatorMissedBlocks.entries()),
      nonces: this.nonces.toJSON()
    };
  }

  fromJSON(data) {
    this.balances = new Map(data.balances || []);
    this.stakes = new Map(data.stakes || []);
    this.unstaking = new Map(data.unstaking || []);
    this.publicKeys = new Map(data.publicKeys || []);
    this.contracts = new Map(data.contracts || []);
    this.validatorMissedBlocks = new Map(data.validatorMissedBlocks || []);
    this.nonces.fromJSON(data.nonces || []);
  }

  // Clear all state
  clear() {
    this.balances.clear();
    this.stakes.clear();
    this.unstaking.clear();
    this.publicKeys.clear();
    this.contracts.clear();
    this.validatorMissedBlocks.clear();
    this.nonces.reset();
  }
}

export default StateEngine;