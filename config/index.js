import testnet from './testnet.js';
import mainnet from './mainnet.js';
import publicTestnet from './public-testnet.js';

// Parse command line arguments
const args = process.argv.slice(2);
let networkArg = 'testnet';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--network' && args[i + 1]) {
    networkArg = args[i + 1];
  }
}

// Use environment variable or command line arg
const network = process.env.NODE_ENV || networkArg;

const configs = {
  testnet,
  mainnet,
  'public-testnet': publicTestnet
};

const config = configs[network];

if (!config) {
  console.error(`❌ Invalid network: ${network}`);
  console.log('Available networks: testnet, mainnet, public-testnet');
  process.exit(1);
}

// Validate configuration
if (!config.chainId) {
  throw new Error('Chain ID is required');
}

if (!config.genesisAllocations) {
  throw new Error('Genesis allocations are required');
}

console.log(`\n📡 Loading configuration for: ${config.networkName}`);
console.log(`🔗 Chain ID: ${config.chainId}`);
console.log(`🚰 Faucet: ${config.faucetEnabled ? 'ENABLED' : 'DISABLED'}`);
console.log(`👥 Max Peers: ${config.maxPeers || 'unlimited'}\n`);

export default config;