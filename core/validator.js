class Validator {
    constructor(address, stake) {
      this.address = address;
      this.stake = stake;
      this.lockedUntil = null;
      this.totalRewards = 0;
      this.isActive = true;
      this.missedBlocks = 0;
      this.slashed = false;
      this.blocksCreated = 0;
      this.registeredAt = Date.now();
    }
  
    addStake(amount) {
      this.stake += amount;
    }
  
    removeStake(amount) {
      this.stake = Math.max(0, this.stake - amount);
    }
  
    addReward(amount) {
      this.totalRewards += amount;
    }
  
    incrementMissedBlocks() {
      this.missedBlocks++;
    }
  
    resetMissedBlocks() {
      this.missedBlocks = 0;
    }
  
    incrementBlocksCreated() {
      this.blocksCreated++;
    }
  
    slash(percentage) {
      const slashAmount = this.stake * percentage;
      this.stake -= slashAmount;
      this.slashed = true;
      return slashAmount;
    }
  
    deactivate() {
      this.isActive = false;
    }
  
    activate() {
      this.isActive = true;
      this.slashed = false;
      this.missedBlocks = 0;
    }
  
    lockStake(unlockBlock) {
      this.lockedUntil = unlockBlock;
    }
  
    isStakeLocked(currentBlock) {
      return this.lockedUntil !== null && currentBlock < this.lockedUntil;
    }
  
    unlockStake() {
      this.lockedUntil = null;
    }
  
    toJSON() {
      return {
        address: this.address,
        stake: this.stake,
        lockedUntil: this.lockedUntil,
        totalRewards: this.totalRewards,
        isActive: this.isActive,
        missedBlocks: this.missedBlocks,
        slashed: this.slashed,
        blocksCreated: this.blocksCreated,
        registeredAt: this.registeredAt
      };
    }
  
    static fromJSON(data) {
      const validator = new Validator(data.address, data.stake);
      validator.lockedUntil = data.lockedUntil;
      validator.totalRewards = data.totalRewards || 0;
      validator.isActive = data.isActive !== false;
      validator.missedBlocks = data.missedBlocks || 0;
      validator.slashed = data.slashed || false;
      validator.blocksCreated = data.blocksCreated || 0;
      validator.registeredAt = data.registeredAt || Date.now();
      return validator;
    }
  }
  
  export default Validator;