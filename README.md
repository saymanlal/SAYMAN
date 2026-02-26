# Sayman Blockchain - Phase 3: Deterministic PoS + Smart Contracts

![Phase](https://img.shields.io/badge/Phase-3-blue)
![Status](https://img.shields.io/badge/Status-Complete-green)
![Node](https://img.shields.io/badge/Node-v20+-green)

## Overview

Phase 3 is a complete architectural overhaul that fixes all design flaws from Phase 1 and 2, and adds a deterministic JavaScript smart contract engine. The blockchain now achieves **perfect state replay** - meaning any node can rebuild identical state by replaying transactions from genesis.

## What's New in Phase 3

### 🏗️ Architectural Fixes

#### 1. Deterministic State Engine
**Problem in Phase 1/2:** State was partially stored off-chain (validators in memory, rewards not in blocks).

**Solution:** Everything is now derived from on-chain transactions:
- All state computed by replaying blockchain from genesis
- No hidden state, no API-only mutations
- Identical rebuild on any node restart

#### 2. Transaction-Based State Changes
**Problem in Phase 1/2:** Staking, rewards, and slashing happened via API calls without blockchain records.

**Solution:** New transaction types:
```
GENESIS          → Initial token distribution
TRANSFER         → Send tokens
STAKE            → Lock tokens to become validator
UNSTAKE          → Initiate stake withdrawal
REWARD           → Block rewards (inserted automatically)
CONTRACT_DEPLOY  → Deploy smart contract
CONTRACT_CALL    → Execute contract method
SLASH            → Penalty for validator misbehavior
```

Every state change is a transaction in a block.

#### 3. Automatic Block Production
**Problem in Phase 1/2:** Manual mining endpoints, inconsistent timing.

**Solution:**
- Fixed interval block production (5 seconds)
- Automatic validator selection
- Automatic reward insertion
- No manual intervention needed

#### 4. Genesis Consistency
**Problem in Phase 1/2:** Genesis state injected at runtime, not in genesis block.

**Solution:**
- Genesis block contains all initial allocations
- Genesis block contains initial stakes
- Nothing injected outside the blockchain

#### 5. Perfect State Rebuild
**Problem in Phase 1/2:** Restart caused state inconsistencies.

**Solution:**
- Load blocks from storage
- Clear all state
- Replay every transaction from genesis
- Rebuild: balances, stakes, validators, contracts
- Identical state guaranteed

### 🧠 Smart Contract Engine

#### JavaScript VM
- Uses Node.js `vm` module
- Sandboxed execution environment
- Deterministic (no Date, Math.random, etc.)
- Synchronous execution only
- No network or file access

#### Contract Deployment
```javascript
// Deploy
POST /api/deploy
{
  "from": "your_address",
  "code": "function increment() { state.count = (state.count || 0) + 1; }",
  "privateKey": "your_key"
}

// Transaction created → Block mined → Contract deployed
// Contract address: hash(creator + timestamp)
```

#### Contract Execution
```javascript
// Call
POST /api/call
{
  "from": "your_address",
  "contractAddress": "contract_address",
  "method": "increment",
  "args": {},
  "privateKey": "your_key"
}

// Transaction created → Block mined → Method executed → State updated
```

#### Contract Structure
```javascript
// State object (persistent)
state = {
  count: 0,
  balances: {},
  // any JSON-serializable data
}

// Available in contract context
msg.sender           // Transaction sender
balanceOf(address)   // Check SAYM balance
console.log(...)     // Debug logging

// Example: Token Contract
function mint(args) {
  const { to, amount } = args;
  state.balances = state.balances || {};
  state.balances[to] = (state.balances[to] || 0) + amount;
}

function transfer(args) {
  const { to, amount } = args;
  const from = msg.sender;
  
  state.balances[from] -= amount;
  state.balances[to] = (state.balances[to] || 0) + amount;
}

function balanceOf(args) {
  const { address } = args;
  return state.balances[address] || 0;
}
```

### 🎨 Web Frontend

Full-featured UI built with vanilla JavaScript:

**Pages:**
- **Dashboard**: Network statistics, recent blocks
- **Wallet**: Create/import wallet, view balance
- **Send**: Transfer SAYM tokens
- **Stake**: Stake/unstake tokens
- **Validators**: View active validators
- **Explorer**: Browse blockchain
- **Contracts**: Deploy and call contracts

**Features:**
- Real-time updates (polling)
- Responsive design
- Clean, minimal UI
- No external dependencies

## Architecture
```
┌──────────────────────────────────────────────┐
│          Web Frontend (HTML/CSS/JS)          │
│  • Dashboard                                 │
│  • Wallet management                         │
│  • Transaction creation                      │
│  • Contract deployment/calling               │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│            REST API (Express)                │
│  /stats  /blocks  /balance/:addr             │
│  /send   /stake   /unstake                   │
│  /deploy /call    /contracts                 │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│          Blockchain Core                     │
│  ┌──────────────────────────────┐           │
│  │     State Engine             │           │
│  │  • Balances Map              │           │
│  │  • Stakes Map                │           │
│  │  • Contracts Map             │           │
│  │  • All derived from chain    │           │
│  └──────────────────────────────┘           │
│  ┌──────────────────────────────┐           │
│  │     Transaction Types        │           │
│  │  GENESIS / TRANSFER / STAKE  │           │
│  │  UNSTAKE / REWARD / SLASH    │           │
│  │  CONTRACT_DEPLOY / CALL      │           │
│  └──────────────────────────────┘           │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│        Smart Contract Engine (VM)            │
│  • JavaScript sandbox                        │
│  • Restricted context                        │
│  • State persistence                         │
│  • Deterministic execution                   │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│          P2P Network (WebSocket)             │
│  • Block broadcasting                        │
│  • Transaction broadcasting                  │
│  • Chain synchronization                     │
│  • Multi-node coordination                   │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────┐
│        Persistent Storage (LevelDB)          │
│  • Blockchain storage                        │
│  • Per-node database                         │
│  • State computed on load                    │
└──────────────────────────────────────────────┘
```

## Project Structure
```
sayman-phase3/
├── package.json              # Dependencies
├── server.js                 # Main entry point
├── config.js                 # Configuration
├── README.md                 # This file
│
├── core/
│   ├── blockchain.js         # ✨ Deterministic blockchain
│   ├── block.js              # Block structure
│   ├── transaction.js        # ✨ All transaction types
│   ├── state.js              # ✨ NEW: State engine
│   ├── pos.js                # Proof of Stake
│   └── contracts.js          # ✨ NEW: Contract engine
│
├── p2p/
│   └── server.js             # P2P networking
│
├── api/
│   └── routes.js             # ✨ Enhanced API
│
├── wallet/
│   └── wallet.js             # Wallet management
│
├── frontend/
│   ├── index.html            # ✨ NEW: Web UI
│   ├── style.css             # ✨ NEW: Styling
│   └── app.js                # ✨ NEW: Frontend logic
│
└── data/                      # Database files
    └── blockchain_6001/       # Per-node DB
```

## Installation

### Prerequisites
- Node.js v20+
- npm v9+

### Setup
```bash
# Create directory
mkdir sayman-phase3
cd sayman-phase3

# Initialize npm
npm init -y

# Install dependencies
npm install express elliptic level uuid ws
```

## Configuration (config.js)
```javascript
export default {
  network: 'testnet',
  port: 3000,
  p2pPort: 6001,
  peers: [],
  
  // Blockchain
  blockTime: 5000,        // 5 seconds
  blockReward: 10,        // 10 SAYM per block
  
  // Staking
  minStake: 100,          // Minimum to become validator
  unstakeDelay: 20,       // Blocks to wait before withdrawal
  maxMissedBlocks: 3,     // Threshold for slashing
  slashPercentage: 0.1,   // 10% penalty
  
  // Genesis allocations
  genesisAllocations: {
    'faucet': 1000000,      // Faucet address
    'validator1': 1000      // Initial validator
  },
  
  // Genesis stakes
  genesisStakes: {
    'validator1': 500       // Initial stake
  },
  
  // Contracts
  maxContractSize: 10000,   // Max code length
  maxExecutionSteps: 1000,  // Max execution steps
  gasLimit: 1000000         // Future: gas system
};
```

## Running the Blockchain

### Single Node
```bash
npm start
```

Server starts at `http://localhost:3000`

### Multi-Node Network

**Terminal 1:**
```bash
npm run node1
```

**Terminal 2:**
```bash
npm run node2
```

**Terminal 3:**
```bash
npm run node3
```

Access UIs at:
- Node 1: `http://localhost:3000`
- Node 2: `http://localhost:3001`
- Node 3: `http://localhost:3002`

## Usage Guide

### Using the Web UI

1. **Open Browser**
```
   http://localhost:3000
```

2. **Create Wallet**
   - Click "Wallet" tab
   - Click "Create New Wallet"
   - **Save private key securely!**

3. **Get Test Tokens**
   - Use faucet API or call from another wallet

4. **Send Tokens**
   - Click "Send" tab
   - Enter recipient address
   - Enter amount
   - Enter your private key
   - Click "Send"

5. **Stake Tokens**
   - Click "Stake" tab
   - Enter amount (>= 100 SAYM)
   - Enter private key
   - Click "Stake"
   - Wait for next block (5 seconds)

6. **Deploy Contract**
   - Click "Contracts" tab
   - Enter contract code
   - Enter private key
   - Click "Deploy"

7. **Call Contract**
   - Enter contract address
   - Enter method name
   - Enter arguments (JSON)
   - Enter private key
   - Click "Call"

### Using the API

#### 1. Create Wallet
```javascript
// Simple wallet generator
const crypto = require('crypto');
const privateKey = crypto.randomBytes(32).toString('hex');
const hash = crypto.createHash('sha256').update(privateKey).digest('hex');
const address = hash.substring(0, 40);

console.log('Address:', address);
console.log('Private Key:', privateKey);
```

#### 2. Get Faucet
```bash
curl -X POST http://localhost:3000/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_ADDRESS"}'
```

#### 3. Check Balance
```bash
curl http://localhost:3000/api/balance/YOUR_ADDRESS
```

**Response:**
```json
{
  "address": "YOUR_ADDRESS",
  "balance": 1000,
  "stake": 0,
  "unstaking": false,
  "unlockBlock": null
}
```

#### 4. Send Tokens
```bash
curl -X POST http://localhost:3000/api/send \
  -H "Content-Type: application/json" \
  -d '{
    "from": "YOUR_ADDRESS",
    "to": "RECIPIENT_ADDRESS",
    "amount": 100,
    "privateKey": "YOUR_PRIVATE_KEY"
  }'
```

#### 5. Stake Tokens
```bash
curl -X POST http://localhost:3000/api/stake \
  -H "Content-Type: application/json" \
  -d '{
    "from": "YOUR_ADDRESS",
    "amount": 500,
    "privateKey": "YOUR_PRIVATE_KEY"
  }'
```

#### 6. Deploy Contract
```bash
curl -X POST http://localhost:3000/api/deploy \
  -H "Content-Type: application/json" \
  -d '{
    "from": "YOUR_ADDRESS",
    "code": "function increment() { state.count = (state.count || 0) + 1; } function getCount() { return state.count || 0; }",
    "privateKey": "YOUR_PRIVATE_KEY"
  }'
```

Wait for block, then get contract address:
```bash
curl http://localhost:3000/api/contracts
```

#### 7. Call Contract
```bash
curl -X POST http://localhost:3000/api/call \
  -H "Content-Type: application/json" \
  -d '{
    "from": "YOUR_ADDRESS",
    "contractAddress": "CONTRACT_ADDRESS",
    "method": "increment",
    "args": {},
    "privateKey": "YOUR_PRIVATE_KEY"
  }'
```

#### 8. Check Contract State
```bash
curl http://localhost:3000/api/contracts/CONTRACT_ADDRESS
```

**Response:**
```json
{
  "address": "abc123...",
  "creator": "YOUR_ADDRESS",
  "code": "function increment() {...}",
  "state": {
    "count": 5
  },
  "createdAt": 1704067200000
}
```

## Smart Contract Examples

### Counter Contract
```javascript
function increment(args) {
  state.count = (state.count || 0) + 1;
  console.log('Count is now:', state.count);
}

function decrement(args) {
  state.count = (state.count || 0) - 1;
}

function getCount(args) {
  return state.count || 0;
}

function reset(args) {
  state.count = 0;
}
```

### Token Contract
```javascript
function mint(args) {
  const { to, amount } = args;
  state.balances = state.balances || {};
  state.balances[to] = (state.balances[to] || 0) + amount;
  console.log('Minted', amount, 'to', to);
}

function transfer(args) {
  const { to, amount } = args;
  const from = msg.sender;
  
  state.balances = state.balances || {};
  
  if ((state.balances[from] || 0) < amount) {
    throw new Error('Insufficient balance');
  }
  
  state.balances[from] -= amount;
  state.balances[to] = (state.balances[to] || 0) + amount;
  
  console.log('Transferred', amount, 'from', from, 'to', to);
}

function balanceOf(args) {
  const { address } = args;
  return (state.balances || {})[address] || 0;
}
```

### Voting Contract
```javascript
function createPoll(args) {
  const { question, options } = args;
  state.polls = state.polls || [];
  
  state.polls.push({
    id: state.polls.length,
    question,
    options,
    votes: {},
    creator: msg.sender,
    active: true
  });
  
  console.log('Poll created:', question);
}

function vote(args) {
  const { pollId, option } = args;
  const voter = msg.sender;
  
  const poll = state.polls[pollId];
  
  if (!poll.active) {
    throw new Error('Poll is closed');
  }
  
  if (poll.votes[voter]) {
    throw new Error('Already voted');
  }
  
  poll.votes[voter] = option;
  console.log(voter, 'voted', option, 'on poll', pollId);
}

function closePoll(args) {
  const { pollId } = args;
  const poll = state.polls[pollId];
  
  if (msg.sender !== poll.creator) {
    throw new Error('Only creator can close poll');
  }
  
  poll.active = false;
}
```

### Registry Contract
```javascript
function register(args) {
  const { name, data } = args;
  state.registry = state.registry || {};
  
  if (state.registry[name]) {
    throw new Error('Name already registered');
  }
  
  state.registry[name] = {
    owner: msg.sender,
    data,
    timestamp: Date.now()
  };
  
  console.log(name, 'registered by', msg.sender);
}

function update(args) {
  const { name, data } = args;
  const entry = state.registry[name];
  
  if (!entry) {
    throw new Error('Name not registered');
  }
  
  if (entry.owner !== msg.sender) {
    throw new Error('Not the owner');
  }
  
  entry.data = data;
  console.log(name, 'updated');
}

function lookup(args) {
  const { name } = args;
  return state.registry[name] || null;
}
```

## API Reference

### GET /api/stats
Network statistics.

**Response:**
```json
{
  "blocks": 150,
  "validators": 5,
  "totalStake": 2500,
  "mempool": 2,
  "contracts": 10
}
```

### GET /api/blocks
All blocks.

**Response:**
```json
{
  "blocks": [...]
}
```

### GET /api/balance/:address
Account balance and stake.

**Response:**
```json
{
  "address": "...",
  "balance": 1000,
  "stake": 500,
  "unstaking": false,
  "unlockBlock": null
}
```

### POST /api/send
Send tokens.

**Body:**
```json
{
  "from": "sender_address",
  "to": "receiver_address",
  "amount": 100,
  "privateKey": "sender_key"
}
```

### POST /api/stake
Stake tokens.

**Body:**
```json
{
  "from": "your_address",
  "amount": 500,
  "privateKey": "your_key"
}
```

### POST /api/unstake
Initiate unstaking.

**Body:**
```json
{
  "from": "your_address",
  "privateKey": "your_key"
}
```

### GET /api/validators
Active validators.

**Response:**
```json
{
  "validators": [
    {
      "address": "...",
      "stake": 500,
      "missedBlocks": 0
    }
  ]
}
```

### POST /api/deploy
Deploy smart contract.

**Body:**
```json
{
  "from": "your_address",
  "code": "function increment() { ... }",
  "privateKey": "your_key"
}
```

### POST /api/call
Call contract method.

**Body:**
```json
{
  "from": "your_address",
  "contractAddress": "contract_address",
  "method": "increment",
  "args": {},
  "privateKey": "your_key"
}
```

### GET /api/contracts
All deployed contracts.

### GET /api/contracts/:address
Specific contract details.

## Deterministic State Replay

### The Problem (Phase 1/2)
When a node restarted:
```
1. Load blocks from DB
2. Load validator list from separate storage
3. Load stakes from separate storage
4. Balances partially correct
5. State inconsistent across restarts
```

### The Solution (Phase 3)
When a node restarts:
```
1. Load blocks from DB
2. Clear ALL state
3. Replay genesis block
   - Apply GENESIS transactions → balances
   - Apply STAKE transactions → validators
4. Replay block 1
   - Apply transactions
   - Apply REWARD transaction
5. Replay block 2...
6. Continue until all blocks processed
7. State is now IDENTICAL to before restart
```

**Test it:**
```bash
# Start node
npm start

# Do some transactions, staking, etc.
# Check state
curl http://localhost:3000/api/stats

# Stop node (Ctrl+C)

# Restart
npm start

# Check state again
curl http://localhost:3000/api/stats

# Should be IDENTICAL!
```

## Testing

### Automated Test
```bash
chmod +x tests/test-phase3.sh
./tests/test-phase3.sh
```

### Manual Test Flow

1. **Start 3 nodes**
2. **Create wallet and get faucet**
3. **Deploy contract**
4. **Call contract multiple times**
5. **Stake tokens**
6. **Watch automatic blocks**
7. **Stop Node 1**
8. **Restart Node 1**
9. **Verify identical state**

All balances, stakes, validators, and contract states should match!

## Improvements Over Phase 2

| Feature | Phase 2 | Phase 3 |
|---------|---------|---------|
| State Management | Partially off-chain | 100% on-chain |
| State Rebuild | Inconsistent | Deterministic |
| Transaction Types | 4 types | 8 types |
| Smart Contracts | None | JavaScript VM |
| Genesis Block | Hacked | Clean |
| Validator Registry | In-memory | Transaction-based |
| Rewards | Added to balance | REWARD transactions |
| Slashing | Direct manipulation | SLASH transactions |
| Frontend | None | Full web UI |
| Documentation | Basic | Comprehensive |

## Sandbox Restrictions

Contracts CANNOT:
- `require()` modules
- Access `process`
- Use `Date` (non-deterministic)
- Use `Math.random()` (non-deterministic)
- Use `setTimeout`/`setInterval`
- Access filesystem
- Make network requests
- Access global scope

Contracts CAN:
- Read/write `state` object
- Use `msg.sender`
- Call `balanceOf(address)`
- Use `console.log()` for debugging
- Pure JavaScript logic
- JSON operations
- Math (except random)

## Troubleshooting

### Contract Execution Fails
```bash
# Check contract code syntax
# Make sure no disallowed operations
# Check method exists
# Check arguments format
```

### State Not Rebuilding
```bash
# Delete database
rm -rf data/

# Restart
npm start

# Should rebuild from genesis
```

### Frontend Not Loading
```bash
# Check server is running
curl http://localhost:3000/

# Check console for errors
# Open browser DevTools
```

## Security Notes

**This is educational software. NOT production-ready.**

Missing for production:
- Cryptographic randomness beacon
- Byzantine fault tolerance
- Economic security analysis
- Formal verification
- Audit
- Gas system for contracts
- Contract size limits enforcement
- DDoS protection
- Rate limiting
- Access control

## License

MIT

## Version

3.0.0 - Phase 3 Complete