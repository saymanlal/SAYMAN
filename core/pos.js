import crypto from 'crypto';

class ProofOfStake {
  constructor(stakeManager) {
    this.stakeManager = stakeManager;
  }

  selectValidator(lastBlockHash) {
    const validators = this.stakeManager.getValidators();
    
    if (validators.length === 0) {
      return null;
    }

    const totalStake = this.stakeManager.getTotalStake();
    const seed = crypto
      .createHash('sha256')
      .update(lastBlockHash + Date.now().toString())
      .digest('hex');
    
    const randomValue = parseInt(seed.substring(0, 8), 16) % totalStake;
    
    let cumulativeStake = 0;
    for (const validator of validators) {
      cumulativeStake += validator.stake;
      if (randomValue < cumulativeStake) {
        return validator.address;
      }
    }

    return validators[0].address;
  }

  getValidatorWeight(address) {
    return this.stakeManager.getStake(address);
  }
}

export default ProofOfStake;