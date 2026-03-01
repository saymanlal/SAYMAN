import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/index.js';
import Blockchain from './core/blockchain.js';
import P2PServer from './p2p/server.js';
import createRouter from './api/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment overrides
if (process.env.PORT) config.port = parseInt(process.env.PORT);
if (process.env.P2P_PORT) config.p2pPort = parseInt(process.env.P2P_PORT);
if (process.env.PEERS) config.peers = process.env.PEERS.split(',');

// Banner
const banner = config.faucetEnabled ? 'TESTNET' : 'MAINNET';
const bannerColor = config.faucetEnabled ? '\x1b[33m' : '\x1b[32m';  // Yellow for testnet, green for mainnet

console.log('\n╔════════════════════════════════════════╗');
console.log('║   SAYMAN BLOCKCHAIN - PHASE 5          ║');
console.log('║   Production Network + Explorer        ║');
console.log('╚════════════════════════════════════════╝\n');
console.log(`${bannerColor}🌐 NETWORK: ${banner}\x1b[0m`);
console.log(`📛 Network Name: ${config.networkName}`);
console.log(`🔗 Chain ID: ${config.chainId}`);
console.log(`🌐 API Port: ${config.port}`);
console.log(`📡 P2P Port: ${config.p2pPort}`);
console.log(`⏱️  Block Time: ${config.blockTime}ms`);
console.log(`💰 Block Reward: ${config.blockReward} SAYM`);
console.log(`🎯 Min Stake: ${config.minStake} SAYM`);
console.log(`⏳ Unstake Delay: ${config.unstakeDelay} blocks`);
console.log(`🚰 Faucet: ${config.faucetEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);
console.log(`👥 Peers: ${config.peers.length > 0 ? config.peers.join(', ') : 'None'}\n`);

// Initialize blockchain
const blockchain = new Blockchain(config);
await blockchain.initialize();

// Initialize P2P
const p2pServer = new P2PServer(blockchain, config.p2pPort, config.peers);
p2pServer.listen();

// Start API server
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/api', createRouter(blockchain, p2pServer, config));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(config.port, () => {
  console.log(`✅ API server running on http://localhost:${config.port}\n`);
});

// Automatic block production
setInterval(async () => {
  const block = await blockchain.createBlock();
  if (block) {
    p2pServer.broadcastBlock(block);
  }
}, config.blockTime);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n👋 Shutting down gracefully...');
  await blockchain.close();
  process.exit(0);
});