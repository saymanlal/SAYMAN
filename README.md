# Sayman Blockchain - Phase 5: Production Network + Explorer

![Phase](https://img.shields.io/badge/Phase-5-blue)
![Status](https://img.shields.io/badge/Status-Complete-green)
![Network](https://img.shields.io/badge/Network-Testnet%2FMainnet-orange)

## Overview

Phase 5 is the **production-ready release** of Sayman blockchain with proper network separation, full blockchain explorer, and a modern Web3-style UI.

### What's New in Phase 5

#### 🌐 Network Configuration System
- **Testnet** and **Mainnet** configurations
- Different parameters per network
- Chain ID validation
- Environment-based configuration loading

#### 🚰 Faucet Restriction
- Faucet **only available on testnet**
- Mainnet rejects faucet requests
- Configurable faucet amounts and cooldowns

#### 🔍 Blockchain Explorer
- Search by block, transaction, or address
- Paginated block listing
- Transaction history per address
- Detailed block viewer
- Real-time updates

#### 📊 Web3 Dashboard
- Live network statistics
- Animated counters
- Real-time block feed
- Validator monitoring panel
- APR estimation

#### 🎨 Modern UI
- Dark theme by default
- Responsive design
- Smooth animations
- Professional styling
- Mobile-friendly

---

## Network Configurations

### Testnet Configuration
```javascript
{
  networkName: 'Sayman Testnet',
  chainId: 'sayman-testnet-1',
  blockTime: 5000,          // Fast blocks
  blockReward: 10,          // Higher rewards
  minStake: 100,            // Lower barrier
  faucetEnabled: true,      // ✅ Faucet available
  faucetAmount: 1000
}
```

**Use cases:**
- Development
- Testing
- Experimentation
- Learning

### Mainnet Configuration
```javascript
{
  networkName: 'Sayman Mainnet',
  chainId: 'sayman-mainnet-1',
  blockTime: 10000,         // Stable blocks
  blockReward: 5,           // Conservative rewards
  minStake: 1000,           // Higher security
  faucetEnabled: false,     // ❌ No faucet
}
```

**Use cases:**
- Production deployments
- Real value transactions
- Serious applications

---

## Installation

### Prerequisites
- Node.js v20+
- npm v9+

### Setup
```bash
# Clone or navigate to project
cd sayman-phase5

# Install dependencies
npm install
```

---

## Running the Network

### Testnet (Default)
```bash
npm run testnet
```

**Output:**
```
╔════════════════════════════════════════╗
║   SAYMAN BLOCKCHAIN - PHASE 5          ║
║   Production Network + Explorer        ║
╚════════════════════════════════════════╝

🌐 NETWORK: TESTNET
📛 Network Name: Sayman Testnet
🔗 Chain ID: sayman-testnet-1
🌐 API Port: 3000
📡 P2P Port: 6001
⏱️  Block Time: 5000ms
💰 Block Reward: 10 SAYM
🎯 Min Stake: 100 SAYM
⏳ Unstake Delay: 10 blocks
🚰 Faucet: ENABLED ✅

✅ API server running on http://localhost:3000
```

Open browser: `http://localhost:3000`

### Mainnet
```bash
npm run mainnet
```

**Output:**
```
🌐 NETWORK: MAINNET
...
🚰 Faucet: DISABLED ❌
```

**Important:** Faucet endpoints return 403 on mainnet.

### Multi-Node Testnet
```bash
# Terminal 1
npm run node1

# Terminal 2
npm run node2

# Terminal 3
npm run node3
```

---

## Project Structure
```
sayman-phase5/
├── config/
│   ├── testnet.js           # ✨ Testnet configuration
│   ├── mainnet.js           # ✨ Mainnet configuration
│   └── index.js             # ✨ Config loader
│
├── core/
│   ├── blockchain.js        # ✨ Updated with chain ID validation
│   ├── block.js             # ✨ Chain ID support
│   ├── transaction.js
│   ├── state.js
│   ├── pos.js
│   └── contracts.js
│
├── api/
│   └── routes.js            # ✨ Explorer endpoints + faucet restriction
│
├── frontend/
│   ├── index.html           # ✨ Complete explorer UI
│   ├── style.css            # ✨ Modern Web3 styling
│   ├── app.js               # ✨ Explorer + live updates
│   └── crypto-client.js
│
├── p2p/
│   └── server.js
│
├── wallet/
│   └── wallet.js
│
├── server.js                # ✨ Network-aware startup
├── package.json             # ✨ New scripts
└── README-PHASE5.md         # This file
```

---

## Features

### 1. Network Banner

Visual indication of current network:
- **Testnet**: Yellow banner
- **Mainnet**: Green banner

Displays:
- Network name
- Chain ID

### 2. Dashboard

**Real-time statistics:**
- Total blocks (animated counter)
- Active validators
- Total stake
- Mempool size
- Deployed contracts
- Block reward
- Block time
- Estimated APR

**Live block feed:**
- Shows last 5 blocks
- Auto-updates every 5 seconds
- Click to view details

### 3. Explorer

**Search functionality:**
- Search by block number
- Search by block hash
- Search by transaction ID
- Search by address

**Block viewer:**
- Paginated block list
- Full block details
- Transaction breakdown

**Transaction viewer:**
- Recent transactions
- Transaction details
- Block association

**Address viewer:**
- Balance and stake
- Validator status
- Transaction history

### 4. Validators Panel

**Display:**
- Total validators
- Total stake
- Estimated APR

**Per validator:**
- Address
- Stake amount (with percentage)
- Missed blocks
- Active/Inactive status
- Slashed status

### 5. Wallet Management

**Features:**
- Create wallet (client-side)
- Import wallet
- View balance and stake
- Send transactions
- Stake/unstake

**All with client-side signing** - private keys never leave browser.

### 6. Smart Contracts

**Features:**
- Deploy contracts
- Call contract methods
- View deployed contracts
- Inspect contract state

### 7. Faucet (Testnet Only)

**Testnet:**
- Request 1000 SAYM
- Configurable amount
- Cooldown period (optional)

**Mainnet:**
- Returns 403 error
- "Faucet disabled on mainnet" message

---

## API Reference

### New Endpoints (Phase 5)

#### GET /api/network
Get network configuration.

**Response:**
```json
{
  "network": "Sayman Testnet",
  "chainId": "sayman-testnet-1",
  "faucetEnabled": true,
  "blockTime": 5000,
  "blockReward": 10,
  "minStake": 100
}
```

#### GET /api/blocks?page=1&limit=20
Get paginated blocks.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)

**Response:**
```json
{
  "blocks": [...],
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

#### GET /api/blocks/:index
Get specific block by index.

**Response:**
```json
{
  "index": 0,
  "timestamp": 1704067200000,
  "transactions": [...],
  "previousHash": "0",
  "validator": "genesis",
  "chainId": "sayman-testnet-1",
  "hash": "abc123..."
}
```

#### GET /api/transactions/:id
Get transaction by ID.

**Response:**
```json
{
  "transaction": {...},
  "blockIndex": 5,
  "blockHash": "abc123...",
  "timestamp": 1704067250000
}
```

#### GET /api/address/:address
Get address details with transaction history.

**Response:**
```json
{
  "address": "abc123...",
  "balance": 1000,
  "stake": 500,
  "unstaking": false,
  "unlockBlock": null,
  "transactions": [...],
  "isValidator": true,
  "validatorInfo": {...}
}
```

#### GET /api/search/:query
Search blockchain by block, transaction, or address.

**Response:**
```json
{
  "type": "block|transaction|address",
  "result": {...}
}
```

### Updated Endpoints

#### POST /api/faucet
Now checks network configuration.

**Testnet Response:**
```json
{
  "success": true,
  "amount": 1000,
  "message": "1000 SAYM credited (pending in mempool)"
}
```

**Mainnet Response (403):**
```json
{
  "error": "Faucet is disabled on mainnet",
  "message": "Faucet is only available on testnet"
}
```

---

## Testing

### Automated Test
```bash
chmod +x test-phase5.sh
./test-phase5.sh
```

Tests:
1. ✅ Network configuration
2. ✅ Network detection (testnet/mainnet)
3. ✅ Stats endpoint
4. ✅ Faucet restriction
5. ✅ Balance checking
6. ✅ Address details
7. ✅ Block pagination
8. ✅ Single block retrieval
9. ✅ Validators
10. ✅ Search functionality
11. ✅ Contracts
12. ✅ Mempool

### Manual UI Testing

1. **Dashboard Test:**
   - Open `http://localhost:3000`
   - Verify stats update every 3 seconds
   - Check live block feed updates every 5 seconds
   - Verify animated counters

2. **Explorer Test:**
   - Click "Explorer"
   - Test search with block number: `0`
   - Test pagination
   - Click on a block to view details

3. **Validator Test:**
   - Click "Validators"
   - Verify validator list loads
   - Check stake percentages
   - View validator details

4. **Wallet Test:**
   - Click "Wallet"
   - Create new wallet
   - Verify private key stays in browser (check Network tab)
   - Import wallet with private key

5. **Faucet Test (Testnet):**
   - Click "Faucet"
   - Enter address
   - Claim tokens
   - Verify balance updates

6. **Mainnet Faucet Test:**
   - Stop testnet node
   - Run `npm run mainnet`
   - Try to access faucet
   - Should see "Faucet disabled" message
   - Verify faucet nav button is hidden

### Network Separation Test
```bash
# Test 1: Start Testnet
npm run testnet
# Open browser, verify yellow banner says "Sayman Testnet"
# Try faucet - should work ✅

# Test 2: Switch to Mainnet
# Stop node (Ctrl+C)
npm run mainnet
# Open browser, verify green banner says "Sayman Mainnet"
# Try faucet - should fail with 403 ❌

# Test 3: Chain ID Validation
# Start testnet node
npm run testnet
# In another terminal, try to connect mainnet peer
# Should reject due to chain ID mismatch
```

---

## Configuration Guide

### Creating Custom Network

1. **Create config file:**
```javascript
// config/custom.js
export default {
  networkName: 'My Custom Network',
  chainId: 'custom-network-1',
  port: 4000,
  p2pPort: 7001,
  blockTime: 8000,
  blockReward: 7,
  minStake: 500,
  faucetEnabled: true,
  faucetAmount: 500,
  genesisAllocations: {
    'faucet': 5000000,
    'validator1': 2000
  },
  genesisStakes: {
    'validator1': 1000
  }
};
```

2. **Add to config/index.js:**
```javascript
import custom from './custom.js';

const configs = {
  testnet,
  mainnet,
  custom  // Add here
};
```

3. **Run:**
```bash
NODE_ENV=custom npm start
```

### Environment Variables

Override config with environment variables:
```bash
# Override port
PORT=4000 npm run testnet

# Override P2P port
P2P_PORT=7001 npm run testnet

# Add peers
PEERS=ws://peer1:6001,ws://peer2:6002 npm run testnet

# Custom network
NODE_ENV=custom PORT=4000 P2P_PORT=7001 node server.js
```

---

## Differences: Testnet vs Mainnet

| Feature | Testnet | Mainnet |
|---------|---------|---------|
| Chain ID | `sayman-testnet-1` | `sayman-mainnet-1` |
| Block Time | 5 seconds | 10 seconds |
| Block Reward | 10 SAYM | 5 SAYM |
| Min Stake | 100 SAYM | 1000 SAYM |
| Unstake Delay | 10 blocks | 100 blocks |
| Faucet | ✅ Enabled | ❌ Disabled |
| Initial Supply | 10M SAYM (faucet) | 1M SAYM |
| Slash % | 5% | 10% |
| Banner Color | Yellow | Green |
| Use Case | Development | Production |

---

## Security Features

### Chain ID Validation
Prevents nodes from different networks connecting:
```javascript
// Block validation
if (block.chainId !== this.chainId) {
  throw new Error('Chain ID mismatch');
}

// Peer connection
if (peer.chainId !== this.chainId) {
  reject('Wrong network');
}
```

### Faucet Restriction
Enforced at API level:
```javascript
if (!config.faucetEnabled) {
  return res.status(403).json({
    error: 'Faucet disabled on mainnet'
  });
}
```

### Client-Side Signing
All transactions signed in browser:
- Private keys never transmitted
- Server only sees signed transactions
- Zero-trust architecture

---

## UI Features

### Animations
- Counter increments (scale effect)
- Block slides (slide-in from left)
- Card hovers (lift effect)
- Page transitions (fade-in)

### Responsive Design
- Mobile-friendly navigation
- Flexible grid layouts
- Touch-optimized buttons
- Readable on all screen sizes

### Dark Theme
- Easy on the eyes
- Professional appearance
- Reduced eye strain
- Battery friendly (OLED)

### Live Updates
- Stats update every 3 seconds
- Blocks update every 5 seconds
- Smooth transitions
- No page reloads needed

---

## Troubleshooting

### Issue: Faucet not working
**Solution:**
1. Check network: `curl http://localhost:3000/api/network | jq '.faucetEnabled'`
2. If `false`, you're on mainnet
3. Switch to testnet: `npm run testnet`

### Issue: UI not updating
**Solution:**
1. Check browser console for errors
2. Verify API is running: `curl http://localhost:3000/api/stats`
3. Hard refresh: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

### Issue: Chain ID mismatch
**Solution:**
1. Delete database: `rm -rf data/`
2. Restart node
3. This rebuilds genesis with correct chain ID

### Issue: Peers not connecting
**Solution:**
1. Check chain IDs match
2. Verify P2P ports are open
3. Check PEERS environment variable format

---

## Production Checklist

Before deploying to production:

- [ ] Use mainnet configuration
- [ ] Disable faucet (verified)
- [ ] Set appropriate min stake
- [ ] Configure proper genesis allocations
- [ ] Set stable block time (10s+)
- [ ] Configure proper P2P peers
- [ ] Set up monitoring
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Set up backups
- [ ] Test chain ID validation
- [ ] Test faucet restriction
- [ ] Verify deterministic rebuild
- [ ] Load test network
- [ ] Security audit

---

## Roadmap

### Phase 5 ✅ Complete
- Network configuration
- Faucet restriction
- Blockchain explorer
- Web3 UI
- Live updates

### Future Phases (Ideas)
- **Phase 6**: WebSocket real-time updates
- **Phase 7**: Advanced contract features (events, logs)
- **Phase 8**: Mobile app
- **Phase 9**: Cross-chain bridges
- **Phase 10**: ZK proofs

---

## License

MIT

## Version

5.0.0 - Phase 5 Complete

---

**Sayman Blockchain Phase 5**  
*Production-Ready Network Separation + Explorer + Web3 UI*

Built with ❤️ for blockchain innovation