# Sayman Blockchain - Phase 2: Advanced Proof-of-Stake + P2P Network

![Phase](https://img.shields.io/badge/Phase-2-blue)
![Status](https://img.shields.io/badge/Status-Complete-green)
![Node](https://img.shields.io/badge/Node-v20+-green)

## Overview

Phase 2 builds on Phase 1 by adding a complete validator system, P2P networking, block rewards, slashing, and multi-node synchronization.

## What's New in Phase 2

### Major Features Added

#### 1. Complete Validator System
- **Validator Registry**: Full validator tracking with metadata
- **Validator Objects**: Track stake, rewards, missed blocks, slashed status
- **Validator Lifecycle**: Registration → Active → Inactive → Slashed

#### 2. Staking Improvements
- **Stake Locking**: Stakes are locked when initiated
- **Unstaking Period**: Configurable delay before withdrawal
- **Minimum Stake**: Enforced threshold to become validator
- **Stake History**: Track all stake changes

#### 3. Block Rewards
- **Fixed Rewards**: Every block gives rewards to validator
- **Reward Tracking**: Total rewards per validator
- **Reward Distribution**: Automatic on block creation

#### 4. Slashing System
- **Missed Blocks Tracking**: Count consecutive misses
- **Automatic Slashing**: Slash X% stake after threshold
- **Deactivation**: Remove from validator set if below minimum
- **Slash Percentage**: Configurable penalty

#### 5. P2P Networking
- **WebSocket Protocol**: Real-time communication
- **Block Broadcasting**: New blocks sent to all peers
- **Transaction Broadcasting**: Mempool sync across network
- **Chain Synchronization**: Automatic longest chain selection
- **Peer Discovery**: Connect to multiple peers

#### 6. Multi-Node Support
- **Independent Nodes**: Run multiple instances
- **Automatic Sync**: Nodes sync state automatically
- **Network Consensus**: Agreement on valid chain
- **Fault Tolerance**: Network survives node failures

## Architecture
```
┌─────────────────────────────────────────────┐
│           REST API (Express)                │
│  All Phase 1 endpoints +                    │
│  POST /unstake                              │
│  POST /withdraw                             │
│  GET  /validators/all                       │
│  GET  /validator/:address                   │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Enhanced Blockchain Core            │
│  • Validator registry                       │
│  • Reward distribution                      │
│  • Slashing enforcement                     │
│  • State persistence                        │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│            P2P Network Layer                │
│  • WebSocket server                         │
│  • Peer management                          │
│  • Block broadcasting                       │
│  • Transaction broadcasting                 │
│  • Chain synchronization                    │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        Enhanced PoS + Slashing              │
│  • Weighted validator selection             │
│  • Validator rotation logic                 │
│  • Missed block tracking                    │
│  • Automatic slashing                       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        Persistent Storage (LevelDB)         │
│  • Per-node databases                       │
│  • Validator state                          │
│  • Stake tracking                           │
└─────────────────────────────────────────────┘
```

## Project Structure
```
sayman-phase2/
├── package.json              # Dependencies (added ws)
├── index.js                  # Enhanced main server
├── create-wallet.js          # Wallet utility
│
├── config/
│   ├── mainnet.json         # Updated with P2P config
│   └── testnet.json         # Updated with P2P config
│
├── core/
│   ├── block.js             # Same as Phase 1
│   ├── blockchain.js        # ✨ Enhanced with rewards/slashing
│   ├── transaction.js       # Same as Phase 1
│   ├── wallet.js            # Same as Phase 1
│   ├── pos.js               # ✨ Enhanced with rotation
│   ├── stake.js             # ✨ Complete validator tracking
│   ├── validator.js         # ✨ NEW: Validator class
│   ├── rewards.js           # ✨ NEW: Reward system
│   ├── slashing.js          # ✨ NEW: Slashing logic
│   └── p2p.js               # ✨ NEW: P2P networking
│
├── storage/
│   └── db.js                # Enhanced for per-node DBs
│
├── routes/
│   └── api.js               # ✨ Additional endpoints
│
└── data/                     # Separate DB per node
    ├── mainnet_6001/
    ├── testnet_6001/
    ├── testnet_6002/
    └── testnet_6003/
```

## Installation

### Prerequisites
- Node.js v20+
- npm v9+

### Setup
```bash
# Create directory
mkdir sayman-phase2
cd sayman-phase2

# Initialize npm
npm init -y

# Install dependencies (note: added ws)
npm install express elliptic level uuid ws
```

### Configuration

**package.json scripts:**
```json
{
  "scripts": {
    "start": "node index.js",
    "mainnet": "NODE_ENV=mainnet node index.js",
    "testnet": "NODE_ENV=testnet node index.js",
    "node1": "PORT=3000 P2P_PORT=6001 NODE_ENV=testnet node index.js",
    "node2": "PORT=3001 P2P_PORT=6002 PEERS=ws://localhost:6001 NODE_ENV=testnet node index.js",
    "node3": "PORT=3002 P2P_PORT=6003 PEERS=ws://localhost:6001,ws://localhost:6002 NODE_ENV=testnet node index.js"
  }
}
```

## Running Multi-Node Network

### Start Three Nodes

**Terminal 1 (Node 1 - Bootstrap):**
```bash
npm run node1
```

**Output:**
```
╔════════════════════════════════════════╗
║   SAYMAN BLOCKCHAIN - PHASE 2          ║
║   Advanced Proof-of-Stake              ║
╚════════════════════════════════════════╝

Network: TESTNET
API Port: 3000
P2P Port: 6001
Block Time: 5000ms
Block Reward: 10 SAYM
Min Stake: 10 SAYM
Unstake Delay: 10 blocks
Slash Percentage: 5%
Faucet: Enabled
Auto-mine: Enabled
Peers: None

✓ Loaded 1 blocks from storage
✓ P2P server listening on port 6001
✓ API server running on http://localhost:3000
✓ Genesis validator has 100 SAYM staked
```

**Terminal 2 (Node 2):**
```bash
npm run node2
```

**Output:**
```
Network: TESTNET
API Port: 3001
P2P Port: 6002
Peers: ws://localhost:6001

✓ Created genesis block
✓ P2P server listening on port 6002
✓ Connected to peer: ws://localhost:6001
✓ API server running on http://localhost:3001
```

**Terminal 3 (Node 3):**
```bash
npm run node3
```

**Output:**
```
Network: TESTNET
API Port: 3002
P2P Port: 6003
Peers: ws://localhost:6001, ws://localhost:6002

✓ Created genesis block
✓ P2P server listening on port 6003
✓ Connected to peer: ws://localhost:6001
✓ Connected to peer: ws://localhost:6002
✓ API server running on http://localhost:3002
```

## Usage Guide

### 1. Create Wallet
```bash
node create-wallet.js
```

Save the address and private key.

### 2. Get Faucet (Any Node)
```bash
curl -X POST http://localhost:3000/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_ADDRESS"}'
```

**Wait 5 seconds for block creation.**

### 3. Verify Balance on All Nodes
```bash
# Node 1
curl http://localhost:3000/api/balance/YOUR_ADDRESS

# Node 2
curl http://localhost:3001/api/balance/YOUR_ADDRESS

# Node 3
curl http://localhost:3002/api/balance/YOUR_ADDRESS
```

All should show the same balance! ✨

### 4. Stake to Become Validator
```bash
curl -X POST http://localhost:3000/api/stake \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS",
    "amount": 100,
    "privateKey": "YOUR_PRIVATE_KEY"
  }'
```

**Response:**
```json
{
  "success": true,
  "validator": {
    "address": "YOUR_ADDRESS",
    "stake": 100,
    "lockedUntil": null,
    "totalRewards": 0,
    "isActive": true,
    "missedBlocks": 0,
    "slashed": false,
    "blocksCreated": 0,
    "registeredAt": 1704067200000
  },
  "message": "Stake added successfully"
}
```

### 5. Check Validator Info
```bash
curl http://localhost:3000/api/validator/YOUR_ADDRESS
```

**Response:**
```json
{
  "address": "YOUR_ADDRESS",
  "stake": 100,
  "lockedUntil": null,
  "totalRewards": 0,
  "isActive": true,
  "missedBlocks": 0,
  "slashed": false,
  "blocksCreated": 0,
  "registeredAt": 1704067200000
}
```

### 6. Watch Automatic Block Creation
Blocks are created every 5 seconds automatically:

**Node 1 Console:**
```
✓ Block #2 created by genesis
  Transactions: 1
  Reward: 10 SAYM
  Hash: a1b2c3d4e5f6...

✓ Block #3 created by YOUR_ADDRESS
  Transactions: 0
  Reward: 10 SAYM
  Hash: f6e5d4c3b2a1...
```

### 7. Unstake Tokens
```bash
curl -X POST http://localhost:3000/api/unstake \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS",
    "privateKey": "YOUR_PRIVATE_KEY"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Unstake initiated. Funds will be available at block 25",
  "unlockBlock": 25,
  "currentBlock": 15
}
```

### 8. Withdraw After Unlock Period
```bash
# Wait until current block >= unlock block
curl http://localhost:3000/api/stats  # Check current block

# Then withdraw
curl -X POST http://localhost:3000/api/withdraw \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS",
    "privateKey": "YOUR_PRIVATE_KEY"
  }'
```

**Response:**
```json
{
  "success": true,
  "amount": 100,
  "message": "100 SAYM withdrawn successfully"
}
```

### 9. Check All Validators
```bash
curl http://localhost:3000/api/validators
```

**Response:**
```json
{
  "count": 2,
  "validators": [
    {
      "address": "genesis",
      "stake": 100,
      "lockedUntil": null,
      "totalRewards": 50,
      "isActive": true,
      "missedBlocks": 0,
      "slashed": false,
      "blocksCreated": 5,
      "registeredAt": 1704067200000
    },
    {
      "address": "YOUR_ADDRESS",
      "stake": 100,
      "lockedUntil": null,
      "totalRewards": 30,
      "isActive": true,
      "missedBlocks": 0,
      "slashed": false,
      "blocksCreated": 3,
      "registeredAt": 1704067210000
    }
  ]
}
```

## New API Endpoints

### POST /unstake
Initiate unstaking process.

**Body:**
```json
{
  "address": "your_address",
  "privateKey": "your_private_key"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Unstake initiated. Funds will be available at block 25",
  "unlockBlock": 25,
  "currentBlock": 15
}
```

### POST /withdraw
Withdraw unstaked tokens after unlock period.

**Body:**
```json
{
  "address": "your_address",
  "privateKey": "your_private_key"
}
```

**Response:**
```json
{
  "success": true,
  "amount": 100,
  "message": "100 SAYM withdrawn successfully"
}
```

### GET /validators/all
Get all validators (including inactive).

**Response:**
```json
{
  "count": 3,
  "validators": [...]
}
```

### GET /validator/:address
Get specific validator details.

**Response:**
```json
{
  "address": "...",
  "stake": 100,
  "totalRewards": 50,
  "isActive": true,
  "missedBlocks": 0,
  "slashed": false,
  "blocksCreated": 5
}
```

## Key Concepts

### Validator Lifecycle
```
1. REGISTER
   └─> Stake tokens (amount >= minStake)
       └─> Validator becomes ACTIVE

2. ACTIVE
   ├─> Create blocks → Earn rewards
   ├─> Miss blocks → Increment missedBlocks counter
   └─> Miss too many → Get SLASHED

3. SLASHED
   └─> Lose X% of stake
       └─> If stake < minStake → INACTIVE

4. UNSTAKE
   └─> Initiate withdrawal
       └─> Wait unstakeDelay blocks
           └─> WITHDRAW stake
```

### Block Rewards

Every block created:
1. Validator is selected (weighted by stake)
2. Block is created with transactions
3. **Reward transaction is added** to block
4. Validator balance increases by reward amount
5. `totalRewards` counter increments

### Slashing

If validator misses `maxMissedBlocks` (default: 3):
1. Slash `slashPercentage` (default: 5%) of stake
2. Reset missed blocks counter
3. If remaining stake < `minStake`: Deactivate

**Example:**
- Validator has 1000 SAYM staked
- Misses 3 blocks
- Slashed 5% = 50 SAYM
- Remaining: 950 SAYM
- If minStake is 100, stays active
- If minStake is 1000, becomes inactive

### P2P Synchronization

When nodes connect:
1. New node requests chain from peers
2. Peers send their chains
3. Node selects longest valid chain
4. Node rebuilds state from that chain

When new block is created:
1. Block is broadcast to all peers
2. Peers validate block
3. If valid, peers add to their chain
4. All nodes stay in sync

## Configuration

### Testnet Config (testnet.json)
```json
{
  "network": "testnet",
  "port": 3001,
  "p2pPort": 6002,
  "peers": [],
  "initialSupply": 10000000,
  "blockTime": 5000,
  "blockReward": 10,
  "minimumStake": 10,
  "unstakeDelay": 10,
  "slashPercentage": 0.05,
  "maxMissedBlocks": 3,
  "genesisValidator": "genesis",
  "faucetEnabled": true,
  "faucetAmount": 100,
  "autoMine": true
}
```

### Mainnet Config (mainnet.json)
```json
{
  "network": "mainnet",
  "port": 3000,
  "p2pPort": 6001,
  "peers": [],
  "initialSupply": 1000000,
  "blockTime": 10000,
  "blockReward": 5,
  "minimumStake": 100,
  "unstakeDelay": 50,
  "slashPercentage": 0.05,
  "maxMissedBlocks": 5,
  "genesisValidator": "genesis",
  "faucetEnabled": false,
  "autoMine": true
}
```

## Testing

Run automated test:
```bash
chmod +x tests/test-phase2.sh
./tests/test-phase2.sh
```

## Improvements Over Phase 1

| Feature | Phase 1 | Phase 2 |
|---------|---------|---------|
| Validator System | Basic stake tracking | Complete validator objects |
| Rewards | None | Automatic block rewards |
| Slashing | None | Automatic slashing system |
| Unstaking | Not supported | Supported with delay |
| P2P Network | None | Full WebSocket P2P |
| Multi-Node | Single node only | Multiple synchronized nodes |
| Persistence | Basic | Per-node databases |
| Block Creation | Manual | Automatic every N seconds |

## Remaining Limitations

Phase 2 still has limitations (fixed in Phase 3):

1. **Off-Chain State**: Validators stored separately from blockchain
2. **Non-Deterministic**: State rebuild not fully deterministic
3. **No Smart Contracts**: Can't deploy custom logic
4. **Manual Transactions**: All state changes via API
5. **Genesis Hacks**: Initial state injected at runtime

## Troubleshooting

### Nodes Not Syncing
```bash
# Check P2P connections in logs
# Should see "Connected to peer" messages

# Verify ports are correct
lsof -i :6001
lsof -i :6002
lsof -i :6003
```

### Different Block Counts
```bash
# Check stats on each node
curl http://localhost:3000/api/stats
curl http://localhost:3001/api/stats
curl http://localhost:3002/api/stats

# Restart nodes to force resync
```

### Validator Not Creating Blocks
```bash
# Check validator is active
curl http://localhost:3000/api/validator/YOUR_ADDRESS

# Check stake is >= minStake
# Check hasn't been slashed
```

## Next Steps

Phase 2 provides multi-node networking. Continue to:
- **Phase 3**: Deterministic state replay and smart contracts

## License

MIT

## Version

2.0.0 - Phase 2 Complete