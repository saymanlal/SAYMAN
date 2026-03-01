export default {
    networkName: 'Sayman Testnet',
    chainId: 'sayman-testnet-1',
    
    // Network settings
    port: 3000,
    p2pPort: 6001,
    peers: [],
    
    // Blockchain parameters
    blockTime: 5000,        // 5 seconds (fast for testing)
    blockReward: 10,        // 10 SAYM per block
    
    // Staking parameters
    minStake: 100,          // Lower minimum for testing
    unstakeDelay: 10,       // 10 blocks (~50 seconds)
    maxMissedBlocks: 3,
    slashPercentage: 0.05,  // 5%
    
    // Genesis configuration
    genesisAllocations: {
      'faucet': 10000000,        // 10M SAYM for faucet
      'validator1': 5000,        // Initial validator
      'treasury': 5000000        // Treasury reserve
    },
    
    genesisStakes: {
      'validator1': 1000         // Initial stake
    },
    
    // Faucet settings
    faucetEnabled: true,
    faucetAmount: 1000,
    faucetCooldown: 60000,      // 1 minute between requests
    
    // Contract settings
    maxContractSize: 50000,
    maxExecutionSteps: 10000,
    gasLimit: 5000000,
    
    // Supply
    maxSupply: 21000000,        // 21M SAYM max
    
    // UI Settings
    theme: 'dark',
    explorerEnabled: true
  };