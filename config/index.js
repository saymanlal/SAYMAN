import testnet from './testnet.js';
import mainnet from './mainnet.js';

const network = process.env.NODE_ENV || 'testnet';

const configs = {
  testnet,
  mainnet
};

const config = configs[network];

if (!config) {
  throw new Error(`Invalid network: ${network}. Use 'testnet' or 'mainnet'`);
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
console.log(`🚰 Faucet: ${config.faucetEnabled ? 'ENABLED' : 'DISABLED'}\n`);

export default config;