import crypto from 'crypto';

class ProofOfStake {
  constructor(state, config) {
    this.state = state;
    this.config = config;
    this.lastValidator = null;
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
    
    // Deterministic random selection based on last block hash
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
}

export default ProofOfStake;