import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import Blockchain from './core/blockchain.js';
import P2PServer from './p2p/server.js';
import createRouter from './api/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
let mode = 'fullnode';
let bootstrapPeers = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--mode' && args[i + 1]) {
    mode = args[i + 1];
  }
  if (args[i] === '--bootstrap' && args[i + 1]) {
    bootstrapPeers = args[i + 1].split(',');
  }
}

// Validate mode
const validModes = ['validator', 'fullnode', 'observer'];
if (!validModes.includes(mode)) {
  console.error(`❌ Invalid mode: ${mode}`);
  console.log('Valid modes: validator, fullnode, observer');
  process.exit(1);
}

// Environment overrides
if (process.env.PORT) config.port = parseInt(process.env.PORT);
if (process.env.P2P_PORT) config.p2pPort = parseInt(process.env.P2P_PORT);
if (process.env.PEERS) {
  const envPeers = process.env.PEERS.split(',');
  bootstrapPeers = [...bootstrapPeers, ...envPeers];
}

// Banner
const modeColors = {
  validator: '\x1b[35m',  // Purple
  fullnode: '\x1b[36m',   // Cyan
  observer: '\x1b[33m'    // Yellow
};

const modeColor = modeColors[mode] || '\x1b[0m';
const bannerColor = config.faucetEnabled ? '\x1b[33m' : '\x1b[32m';

console.log('\n╔════════════════════════════════════════╗');
console.log('║   SAYMAN BLOCKCHAIN - PHASE 7          ║');
console.log('║   Public Network + Real P2P            ║');
console.log('╚════════════════════════════════════════╝\n');
console.log(`${bannerColor}🌐 NETWORK: ${config.faucetEnabled ? 'TESTNET' : 'MAINNET'}\x1b[0m`);
console.log(`${modeColor}🔧 MODE: ${mode.toUpperCase()}\x1b[0m`);
console.log(`📛 Network Name: ${config.networkName}`);
console.log(`🔗 Chain ID: ${config.chainId}`);
console.log(`🌐 API Port: ${config.port}`);
console.log(`📡 P2P Port: ${config.p2pPort}`);
console.log(`⏱️  Block Time: ${config.blockTime}ms`);
console.log(`💰 Block Reward: ${config.blockReward} SAYM`);
console.log(`🎯 Min Stake: ${config.minStake} SAYM`);
console.log(`⏳ Unstake Delay: ${config.unstakeDelay} blocks`);
console.log(`🚰 Faucet: ${config.faucetEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
console.log(`👥 Max Peers: ${config.maxPeers || 'unlimited'}`);

if (bootstrapPeers.length > 0) {
  console.log(`🔗 Bootstrap Peers: ${bootstrapPeers.join(', ')}`);
} else {
  console.log(`🔗 Bootstrap Peers: None (standalone mode)`);
}

console.log();

// Initialize blockchain
const blockchain = new Blockchain(config);
await blockchain.initialize();

// Initialize P2P with bootstrap peers
const p2pServer = new P2PServer(blockchain, config.p2pPort, bootstrapPeers, mode);
p2pServer.listen();
p2pServer.startHeartbeat();

// Start API server
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/api', createRouter(blockchain, p2pServer, config));

// Network stats endpoint
app.get('/api/network/stats', (req, res) => {
  const stats = blockchain.getStats();
  const p2pStats = p2pServer.getNetworkStats();
  
  res.json({
    ...stats,
    p2p: p2pStats,
    mode: mode,
    uptime: process.uptime()
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(config.port, () => {
  console.log(`✅ API server running on http://localhost:${config.port}\n`);
});

// Automatic block production (only for validators)
if (mode === 'validator') {
  setInterval(async () => {
    const block = await blockchain.createBlock();
    if (block) {
      p2pServer.broadcastBlock(block);
    }
  }, config.blockTime);
  
  console.log(`⚡ Block production active (${config.blockTime}ms interval)\n`);
} else {
  console.log(`📖 Running in ${mode} mode - not producing blocks\n`);
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n👋 Shutting down gracefully...');
  p2pServer.close();
  await blockchain.close();
  process.exit(0);
});