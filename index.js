import express from 'express';
import { readFileSync } from 'fs';
import Blockchain from './core/blockchain.js';
import Database from './storage/db.js';
import createRouter from './routes/api.js';
import Wallet from './core/wallet.js';

const network = process.env.NODE_ENV || 'testnet';
const config = JSON.parse(
  readFileSync(`./config/${network}.json`, 'utf-8')
);

console.log('\n╔════════════════════════════════════════╗');
console.log('║   SAYMAN BLOCKCHAIN - PHASE 1          ║');
console.log('╚════════════════════════════════════════╝\n');
console.log(`Network: ${config.network.toUpperCase()}`);
console.log(`Port: ${config.port}`);
console.log(`Block Time: ${config.blockTime}ms`);
console.log(`Min Stake: ${config.minStake} SAYM`);
console.log(`Faucet: ${config.faucetEnabled ? 'Enabled' : 'Disabled'}`);
console.log(`Auto-mine: ${config.autoMine !== false ? 'Enabled' : 'Disabled'}\n`);

const db = new Database(config.network);
const blockchain = new Blockchain(config, db);

await blockchain.initialize();

const app = express();
app.use(express.json());
app.use('/api', createRouter(blockchain));

app.get('/', (req, res) => {
  res.json({
    name: 'Sayman Blockchain',
    coin: 'SAYM',
    network: config.network,
    version: '1.0.0',
    blocks: blockchain.chain.length,
    validators: blockchain.getValidators().length,
    mempool: blockchain.getMempoolSize(),
    autoMine: config.autoMine !== false
  });
});

// Only start auto-mining if enabled (default: true)
if (config.autoMine !== false) {
  setInterval(async () => {
    const block = await blockchain.createBlock();
    if (block) {
      console.log(`✓ Block #${block.index} created by ${block.validator}`);
      console.log(`  Transactions: ${block.transactions.length}`);
      console.log(`  Hash: ${block.hash.substring(0, 16)}...`);
    }
  }, config.blockTime);
  console.log('✓ Auto-mining enabled');
} else {
  console.log('⚠ Auto-mining disabled - use POST /api/mine to create blocks');
}

app.listen(config.port, () => {
  console.log(`✓ API server running on http://localhost:${config.port}`);
  console.log(`✓ Blockchain initialized with ${blockchain.chain.length} blocks`);
  console.log(`✓ Genesis validator has ${blockchain.stakeManager.getStake(config.genesisValidator)} SAYM staked\n`);
  console.log('Available endpoints:');
  console.log(`  GET  http://localhost:${config.port}/`);
  console.log(`  GET  http://localhost:${config.port}/api/chain`);
  console.log(`  GET  http://localhost:${config.port}/api/balance/:address`);
  console.log(`  POST http://localhost:${config.port}/api/transaction`);
  console.log(`  POST http://localhost:${config.port}/api/stake`);
  console.log(`  GET  http://localhost:${config.port}/api/validators`);
  console.log(`  GET  http://localhost:${config.port}/api/mempool`);
  console.log(`  POST http://localhost:${config.port}/api/mine`);
  if (config.faucetEnabled) {
    console.log(`  POST http://localhost:${config.port}/api/faucet`);
  }
  console.log('');
});

process.on('SIGINT', async () => {
  console.log('\n\nShutting down...');
  await db.close();
  process.exit(0);
});

export { blockchain, Wallet };