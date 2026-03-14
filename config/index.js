import testnetConfig from './testnet.js';
import publicTestnetConfig from './public-testnet.js';
import mainnetConfig from './mainnet.js';

export function loadConfig(network = 'testnet') {
  console.log(`\n📡 Loading configuration for: ${network}`);
  
  let config;
  
  switch (network.toLowerCase()) {
    case 'testnet':
      config = testnetConfig;
      break;
    case 'public-testnet':
      config = publicTestnetConfig;
      break;
    case 'mainnet':
      config = mainnetConfig;
      break;
    default:
      console.error(`❌ Invalid network: ${network}`);
      console.log('Available networks: testnet, public-testnet, mainnet');
      process.exit(1);
  }
  
  // Validate configuration
  if (!config.chainId) {
    throw new Error('Chain ID is required in config');
  }
  
  if (!config.genesis || !config.genesis.allocations) {
    throw new Error('Genesis allocations are required in config');
  }
  
  console.log(`🔗 Chain ID: ${config.chainId}`);
  console.log(`🚰 Faucet: ${config.faucetEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`👥 Max Peers: ${config.maxPeers}`);
  console.log('');
  
  return config;
}