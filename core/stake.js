class StakeManager {
    constructor() {
      this.stakes = new Map();
    }
  
    addStake(address, amount) {
      const currentStake = this.stakes.get(address) || 0;
      this.stakes.set(address, currentStake + amount);
    }
  
    getStake(address) {
      return this.stakes.get(address) || 0;
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
        validators.push({ address, stake });
      }
      return validators.sort((a, b) => b.stake - a.stake);
    }
  
    hasMinimumStake(address, minStake) {
      return this.getStake(address) >= minStake;
    }
  
    toJSON() {
      return Array.from(this.stakes.entries()).map(([address, stake]) => ({
        address,
        stake
      }));
    }
  
    fromJSON(data) {
      this.stakes.clear();
      data.forEach(({ address, stake }) => {
        this.stakes.set(address, stake);
      });
    }
  }
  
  export default StakeManager;