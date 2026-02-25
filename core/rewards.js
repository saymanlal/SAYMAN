class RewardSystem {
    constructor(config) {
      this.config = config;
      this.blockReward = config.blockReward;
    }
  
    calculateBlockReward(blockHeight) {
      // Simple fixed reward for now
      // Could add halving logic here in future
      return this.blockReward;
    }
  
    distributeReward(validator, blockHeight) {
      const reward = this.calculateBlockReward(blockHeight);
      validator.addReward(reward);
      return reward;
    }
  
    getTotalRewardsDistributed(validators) {
      return validators.reduce((total, validator) => {
        return total + validator.totalRewards;
      }, 0);
    }
  }
  
  export default RewardSystem;