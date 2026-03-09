export default {
  networkName: 'Sayman Public Testnet',
  chainId: 'sayman-public-testnet-1',
  blockTime: 5000,
  blockReward: 10,
  minStake: 500,
  unstakeDelay: 50,
  slashPercentage: 0.10,
  maxMissedBlocks: 3,
  faucetEnabled: true,
  faucetAmount: 100,
  faucetCooldown: 600000,
  maxPeers: 50,
  
  genesisAllocations: {
    'faucet1': 10000000,
    'genesis1': 100000
  },
  
  genesisStakes: {
    'validator1': 5000
  },
  
  gasLimits: {
    maxGasPerBlock: 10000000,
    minGasPrice: 1
  },
  
  gasCosts: {
    TRANSFER: 21000,
    STAKE: 50000,
    UNSTAKE: 50000,
    CONTRACT_DEPLOY: 100000,
    CONTRACT_CALL: 50000
  }
};