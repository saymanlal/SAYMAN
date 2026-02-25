import Validator from './validator.js';

class StakeManager {
  constructor(config) {
    this.config = config;
    this.validators = new Map();
  }

  addValidator(address, amount) {
    if (amount < this.config.minimumStake) {
      throw new Error(`Minimum stake is ${this.config.minimumStake} SAYM`);
    }

    let validator = this.validators.get(address);

    if (validator) {
      validator.addStake(amount);
      validator.activate();
    } else {
      validator = new Validator(address, amount);
      this.validators.set(address, validator);
    }

    return validator;
  }

  getValidator(address) {
    return this.validators.get(address);
  }

  getStake(address) {
    const validator = this.validators.get(address);
    return validator ? validator.stake : 0;
  }

  getTotalStake() {
    let total = 0;
    for (const validator of this.validators.values()) {
      if (validator.isActive) {
        total += validator.stake;
      }
    }
    return total;
  }

  getActiveValidators() {
    const validators = [];
    for (const validator of this.validators.values()) {
      if (validator.isActive && validator.stake >= this.config.minimumStake) {
        validators.push(validator);
      }
    }
    return validators.sort((a, b) => b.stake - a.stake);
  }

  getAllValidators() {
    return Array.from(this.validators.values());
  }

  hasMinimumStake(address) {
    const validator = this.validators.get(address);
    return validator && validator.stake >= this.config.minimumStake;
  }

  initiateUnstake(address, currentBlock) {
    const validator = this.validators.get(address);
    if (!validator) {
      throw new Error('Validator not found');
    }

    const unlockBlock = currentBlock + this.config.unstakeDelay;
    validator.lockStake(unlockBlock);
    validator.deactivate();

    return unlockBlock;
  }

  canWithdraw(address, currentBlock) {
    const validator = this.validators.get(address);
    if (!validator) return false;
    return !validator.isStakeLocked(currentBlock);
  }

  withdrawStake(address, currentBlock) {
    const validator = this.validators.get(address);
    if (!validator) {
      throw new Error('Validator not found');
    }

    if (validator.isStakeLocked(currentBlock)) {
      throw new Error(`Stake locked until block ${validator.lockedUntil}`);
    }

    const amount = validator.stake;
    validator.removeStake(amount);
    validator.unlockStake();

    return amount;
  }

  toJSON() {
    return Array.from(this.validators.values()).map(v => v.toJSON());
  }

  fromJSON(data) {
    this.validators.clear();
    data.forEach(validatorData => {
      const validator = Validator.fromJSON(validatorData);
      this.validators.set(validator.address, validator);
    });
  }
}

export default StakeManager;