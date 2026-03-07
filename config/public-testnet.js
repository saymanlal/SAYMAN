export default {
    networkName: 'Sayman Public Testnet',
    chainId: 'sayman-public-testnet-1',
    
    // Network settings
    port: 3000,
    p2pPort: 6001,
    peers: [],
    
    // Blockchain parameters
    blockTime: 5000,        // 5 seconds
    blockReward: 10,        // 10 SAYM per block
    
    // Staking parameters
    minStake: 500,          // Higher for public network
    unstakeDelay: 50,       // 50 blocks
    maxMissedBlocks: 5,
    slashPercentage: 0.10,
    
    // Genesis configuration
    genesisAllocations: {
      'faucet': 100000000,       // 100M SAYM for public faucet
      'validator1': 10000,
      'treasury': 50000000
    },
    
    genesisStakes: {
      'validator1': 5000
    },
    
    // Faucet settings
    faucetEnabled: true,
    faucetAmount: 100,          // Lower amount for public
    faucetCooldown: 600000,     // 10 minutes
    
    // Contract settings
    maxContractSize: 100000,
    maxExecutionSteps: 50000,
    gasLimit: 10000000,
    
    // Supply
    maxSupply: 210000000,       // 210M SAYM
    
    // P2P Settings
    maxPeers: 50,
    peerTimeout: 60000,
    
    // Gas configuration
    gasLimits: {
      minGasPrice: 1,
      maxGasPerTx: 5000000,
      maxGasPerBlock: 10000000,
      maxExecutionTime: 50,
      maxStateSize: 51200,
      maxInstructions: 10000
    },
    
    gasCosts: {
      TRANSFER: 21,
      STAKE: 50,
      UNSTAKE: 50,
      CONTRACT_DEPLOY: 500,
      CONTRACT_CALL_BASE: 100,
      STATE_READ: 5,
      STATE_WRITE: 20,
      COMPUTATION: 1
    },
    
    // UI Settings
    theme: 'dark',
    explorerEnabled: true
  };