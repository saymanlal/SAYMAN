export default {
    networkName: 'Sayman Mainnet',
    chainId: 'sayman-mainnet-1',
    
    // Network settings
    port: 3000,
    p2pPort: 6001,
    peers: [],
    
    // Blockchain parameters
    blockTime: 10000,       // 10 seconds (stable for production)
    blockReward: 5,         // 5 SAYM per block
    
    // Staking parameters
    minStake: 1000,         // Higher minimum for security
    unstakeDelay: 100,      // 100 blocks (~16 minutes)
    maxMissedBlocks: 5,
    slashPercentage: 0.10,  // 10%
    
    // Genesis configuration
    genesisAllocations: {
      'validator1': 10000,
      'treasury': 1000000
    },
    
    genesisStakes: {
      'validator1': 5000
    },
    
    // Faucet settings
    faucetEnabled: false,     // ❌ NO FAUCET ON MAINNET
    
    // Contract settings
    maxContractSize: 100000,
    maxExecutionSteps: 50000,
    gasLimit: 10000000,
    
    // Supply
    maxSupply: 21000000,      // 21M SAYM max
    
    // UI Settings
    theme: 'dark',
    explorerEnabled: true
  };