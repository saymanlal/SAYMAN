import crypto from 'crypto';

class ProofOfStake {
  constructor(stakeManager) {
    this.stakeManager = stakeManager;
    this.lastSelectedValidator = null;
  }

  selectValidator(lastBlockHash) {
    const validators = this.stakeManager.getActiveValidators();
    
    if (validators.length === 0) {
      return null;
    }

    // If only one validator, must select them
    if (validators.length === 1) {
      this.lastSelectedValidator = validators[0].address;
      return validators[0].address;
    }

    const totalStake = this.stakeManager.getTotalStake();
    const seed = crypto
      .createHash('sha256')
      .update(lastBlockHash + Date.now().toString())
      .digest('hex');
    
    // Weighted random selection
    const randomValue = parseInt(seed.substring(0, 8), 16) % totalStake;
    
    let cumulativeStake = 0;
    let selectedValidator = null;

    for (const validator of validators) {
      cumulativeStake += validator.stake;
      if (randomValue < cumulativeStake) {
        selectedValidator = validator.address;
        break;
      }
    }

    // Validator rotation: try to avoid same validator twice in a row
    if (selectedValidator === this.lastSelectedValidator && validators.length > 1) {
      // Try one more time with different seed
      const altSeed = crypto
        .createHash('sha256')
        .update(seed + 'rotation')
        .digest('hex');
      
      const altRandomValue = parseInt(altSeed.substring(0, 8), 16) % totalStake;
      cumulativeStake = 0;

      for (const validator of validators) {
        cumulativeStake += validator.stake;
        if (altRandomValue < cumulativeStake) {
          selectedValidator = validator.address;
          break;
        }
      }
    }

    this.lastSelectedValidator = selectedValidator;
    return selectedValidator || validators[0].address;
  }

  getValidatorWeight(address) {
    return this.stakeManager.getStake(address);
  }

  incrementMissedBlock(address) {
    const validator = this.stakeManager.getValidator(address);
    if (validator) {
      validator.incrementMissedBlocks();
    }
  }

  recordBlockCreation(address) {
    const validator = this.stakeManager.getValidator(address);
    if (validator) {
      validator.resetMissedBlocks();
      validator.incrementBlocksCreated();
    }
  }
}

export default ProofOfStake;