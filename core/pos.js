class PoS {
  constructor(config) {
    this.config = config;
    this.validators = new Map(); // address -> { stake, missedBlocks, lastBlock }
    this.minStake = config.minStake || 100;
    this.slashPercentage = config.slashPercentage || 0.10;
    this.maxMissedBlocks = config.maxMissedBlocks || 3;
  }

  addValidator(address, stake) {
    if (stake < this.minStake) {
      throw new Error(`Minimum stake required: ${this.minStake}`);
    }

    const existing = this.validators.get(address);
    if (existing) {
      existing.stake += stake;
    } else {
      this.validators.set(address, {
        address,
        stake,
        missedBlocks: 0,
        lastBlock: 0
      });
    }

    console.log(`✓ Validator added: ${address.substring(0, 8)}... (Stake: ${stake})`);
  }

  removeValidator(address) {
    this.validators.delete(address);
    console.log(`✗ Validator removed: ${address.substring(0, 8)}...`);
  }

  updateValidatorStake(address, newStake) {
    const validator = this.validators.get(address);
    if (validator) {
      validator.stake = newStake;
      if (newStake < this.minStake) {
        this.removeValidator(address);
      }
    }
  }

  slashValidator(address, amount) {
    const validator = this.validators.get(address);
    if (validator) {
      const slashAmount = Math.min(amount, validator.stake);
      validator.stake -= slashAmount;
      
      console.log(`⚠ Validator slashed: ${address.substring(0, 8)}... (-${slashAmount})`);
      
      if (validator.stake < this.minStake) {
        this.removeValidator(address);
      }
    }
  }

  selectValidator(previousValidator = null) {
    const validatorList = Array.from(this.validators.values());
    
    if (validatorList.length === 0) {
      return null;
    }

    // Filter out previous validator to prevent consecutive blocks
    let candidates = validatorList;
    if (previousValidator && validatorList.length > 1) {
      candidates = validatorList.filter(v => v.address !== previousValidator);
    }

    // Calculate total stake
    const totalStake = candidates.reduce((sum, v) => sum + v.stake, 0);
    
    if (totalStake === 0) {
      return null;
    }

    // Weighted random selection
    let random = Math.random() * totalStake;
    
    for (const validator of candidates) {
      random -= validator.stake;
      if (random <= 0) {
        return validator.address;
      }
    }

    // Fallback to first validator
    return candidates[0].address;
  }

  recordMissedBlock(address) {
    const validator = this.validators.get(address);
    if (validator) {
      validator.missedBlocks++;
      
      if (validator.missedBlocks >= this.maxMissedBlocks) {
        const slashAmount = Math.floor(validator.stake * this.slashPercentage);
        this.slashValidator(address, slashAmount);
        validator.missedBlocks = 0;
      }
    }
  }

  resetMissedBlocks(address) {
    const validator = this.validators.get(address);
    if (validator) {
      validator.missedBlocks = 0;
    }
  }

  getValidator(address) {
    return this.validators.get(address);
  }

  getAllValidators() {
    return Array.from(this.validators.values());
  }

  getTotalStake() {
    return Array.from(this.validators.values()).reduce((sum, v) => sum + v.stake, 0);
  }

  getValidatorCount() {
    return this.validators.size;
  }

  toJSON() {
    return {
      validators: Array.from(this.validators.entries()),
      minStake: this.minStake,
      slashPercentage: this.slashPercentage,
      maxMissedBlocks: this.maxMissedBlocks
    };
  }

  fromJSON(data) {
    this.validators = new Map(data.validators || []);
    this.minStake = data.minStake || this.config.minStake;
    this.slashPercentage = data.slashPercentage || this.config.slashPercentage;
    this.maxMissedBlocks = data.maxMissedBlocks || this.config.maxMissedBlocks;
  }
}

export default PoS;