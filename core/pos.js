import crypto from 'crypto';

class ProofOfStake {
  constructor(state, config) {
    this.state = state;
    this.config = config;
    this.validators = new Map();
    this.lastValidator = null;
  }

  addValidator(address, stake) {
    this.validators.set(address, {
      address,
      stake,
      missedBlocks: 0,
      totalRewards: 0
    });
  }

  selectValidator(lastBlockHash) {
    const validators = this.state.getValidators();
    
    if (validators.length === 0) {
      return null;
    }

    if (validators.length === 1) {
      return validators[0].address;
    }

    const totalStake = this.state.getTotalStake();
    
    if (totalStake === 0) {
      return null;
    }

    const seed = crypto
      .createHash('sha256')
      .update(lastBlockHash)
      .digest('hex');
    
    const randomValue = parseInt(seed.substring(0, 16), 16) % totalStake;
    
    let cumulativeStake = 0;
    for (const validator of validators) {
      cumulativeStake += validator.stake;
      if (randomValue < cumulativeStake) {
        return validator.address;
      }
    }

    return validators[0].address;
  }

  checkSlashing(config) {
    const slashTransactions = [];
    const validators = this.state.getValidators();

    for (const validator of validators) {
      if (validator.missedBlocks >= config.maxMissedBlocks) {
        const slashAmount = validator.stake * config.slashPercentage;
        
        slashTransactions.push({
          validator: validator.address,
          amount: slashAmount,
          reason: `Missed ${validator.missedBlocks} blocks`
        });
      }
    }

    return slashTransactions;
  }

  incrementMissedBlocks(validatorAddress) {
    const validators = this.state.getValidators();
    const validator = validators.find(v => v.address === validatorAddress);
    if (validator) {
      validator.missedBlocks = (validator.missedBlocks || 0) + 1;
    }
  }

  resetMissedBlocks(validatorAddress) {
    const validators = this.state.getValidators();
    const validator = validators.find(v => v.address === validatorAddress);
    if (validator) {
      validator.missedBlocks = 0;
    }
  }
}

export default ProofOfStake;