class SlashingSystem {
    constructor(config) {
      this.config = config;
      this.slashPercentage = config.slashPercentage;
      this.maxMissedBlocks = config.maxMissedBlocks;
    }
  
    shouldSlash(validator) {
      return validator.missedBlocks >= this.maxMissedBlocks;
    }
  
    slashValidator(validator, reason = 'missed_blocks') {
      if (!validator.isActive) {
        return { slashed: false, amount: 0, reason: 'already_inactive' };
      }
  
      const slashAmount = validator.slash(this.slashPercentage);
  
      // Deactivate if stake below minimum
      if (validator.stake < this.config.minimumStake) {
        validator.deactivate();
      }
  
      return {
        slashed: true,
        amount: slashAmount,
        reason: reason,
        remainingStake: validator.stake,
        deactivated: !validator.isActive
      };
    }
  
    checkAndSlashInactiveValidators(validators) {
      const slashResults = [];
  
      for (const validator of validators) {
        if (this.shouldSlash(validator)) {
          const result = this.slashValidator(validator, 'missed_blocks');
          if (result.slashed) {
            slashResults.push({
              address: validator.address,
              ...result
            });
          }
        }
      }
  
      return slashResults;
    }
  }
  
  export default SlashingSystem;