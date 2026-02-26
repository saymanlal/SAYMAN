# Sayman Blockchain - Phase 1: Core Blockchain Engine

![Phase](https://img.shields.io/badge/Phase-1-blue)
![Status](https://img.shields.io/badge/Status-Complete-green)
![Node](https://img.shields.io/badge/Node-v20+-green)

## Overview

Phase 1 implements the foundational blockchain infrastructure with basic Proof of Stake consensus, transaction processing, and wallet management.

## What Was Built

### Core Components

#### 1. Block Structure
- **Index**: Sequential block number
- **Timestamp**: Block creation time
- **Transactions**: Array of transactions
- **Previous Hash**: Link to parent block
- **Validator**: Block creator address
- **Stake Weight**: Validator's stake amount
- **Hash**: SHA-256 block identifier

#### 2. Transaction System
- **ID**: UUID v4 identifier
- **From/To**: Sender and receiver addresses
- **Amount**: SAYM token amount
- **Signature**: ECDSA signature (secp256k1)
- **Timestamp**: Transaction creation time

#### 3. Wallet Management
- **Key Generation**: secp256k1 elliptic curve
- **Address Derivation**: SHA-256(publicKey)
- **Signing**: ECDSA with private key
- **Verification**: Public key recovery

#### 4. Proof of Stake
- **Stake Registration**: Lock tokens to become validator
- **Weighted Selection**: Probability proportional to stake
- **Block Rewards**: Fixed reward per block
- **Simple Implementation**: Educational, not production-ready

#### 5. Persistent Storage
- **Database**: LevelDB key-value store
- **Blockchain**: Stored as JSON array
- **State Recovery**: Rebuild from genesis on restart

## Architecture
```
┌─────────────────────────────────────────────┐
│           REST API (Express)                │
│  GET  /chain                                │
│  GET  /balance/:address                     │
│  POST /transaction                          │
│  POST /stake                                │
│  GET  /validators                           │
│  POST /faucet (testnet only)                │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Blockchain Core                     │
│  • Mempool management                       │
│  • Transaction validation                   │
│  • Block creation                           │
│  • Signature verification                   │
│  • Balance tracking                         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        Proof of Stake Engine                │
│  • Validator registry                       │
│  • Weighted random selection                │
│  • Stake management                         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│        Persistent Storage (LevelDB)         │
│  • Block storage                            │
│  • Chain persistence                        │
│  • Auto-recovery on restart                 │
└─────────────────────────────────────────────┘
```

## Project Structure
```
sayman-phase1/
├── package.json              # Dependencies and scripts
├── index.js                  # Main server entry point
├── create-wallet.js          # Wallet generation utility
│
├── config/
│   ├── mainnet.json         # Production configuration
│   └── testnet.json         # Development configuration
│
├── core/
│   ├── block.js             # Block data structure
│   ├── blockchain.js        # Main blockchain logic
│   ├── transaction.js       # Transaction handling
│   ├── wallet.js            # Wallet and key management
│   ├── pos.js               # Proof of Stake consensus
│   └── stake.js             # Staking mechanism
│
├── storage/
│   └── db.js                # LevelDB wrapper
│
├── routes/
│   └── api.js               # REST API endpoints
│
├── assets/
│   ├── sayman-logo.svg      # Project logo
│   └── favicon.svg          # Browser icon
│
└── data/                     # Database files (auto-created)
    ├── mainnet/
    └── testnet/
```

## Installation

### Prerequisites
- Node.js v20 or higher
- npm v9 or higher

### Setup
```bash
# Create directory
mkdir sayman-phase1
cd sayman-phase1

# Initialize npm
npm init -y

# Install dependencies
npm install express elliptic level uuid
```

### Configuration

**package.json scripts:**
```json
{
  "scripts": {
    "start": "node index.js",
    "mainnet": "NODE_ENV=mainnet node index.js",
    "testnet": "NODE_ENV=testnet node index.js"
  }
}
```

## Running the Blockchain

### Start Testnet
```bash
npm run testnet
```

**Output:**
```
╔════════════════════════════════════════╗
║   SAYMAN BLOCKCHAIN - PHASE 1          ║
╚════════════════════════════════════════╝

Network: TESTNET
Port: 3001
Block Time: 5000ms
Min Stake: 10 SAYM
Faucet: Enabled

✓ Created genesis block
✓ API server running on http://localhost:3001
✓ Blockchain initialized with 1 blocks
```

### Start Mainnet
```bash
npm run mainnet
```

Server runs on port 3000 with stricter rules.

## Usage Guide

### 1. Create Wallet
```bash
node create-wallet.js
```

**Output:**
```
╔════════════════════════════════════════╗
║         NEW WALLET CREATED             ║
╚════════════════════════════════════════╝

Address:      a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
Public Key:   04abc123def456...
Private Key:  1234567890abcdef...

⚠️  SAVE YOUR PRIVATE KEY SECURELY!
⚠️  Never share it with anyone!
```

**Save these values!** You'll need them for all operations.

### 2. Get Test Tokens (Testnet Only)
```bash
curl -X POST http://localhost:3001/api/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_ADDRESS"}'
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "from": "system",
    "to": "YOUR_ADDRESS",
    "amount": 100,
    "timestamp": 1704067200000,
    "signature": "faucet"
  },
  "amount": 100,
  "message": "100 SAYM credited to YOUR_ADDRESS"
}
```

### 3. Check Balance
```bash
curl http://localhost:3001/api/balance/YOUR_ADDRESS
```

**Response:**
```json
{
  "address": "YOUR_ADDRESS",
  "balance": 100
}
```

### 4. Stake Tokens
```bash
curl -X POST http://localhost:3001/api/stake \
  -H "Content-Type: application/json" \
  -d '{
    "address": "YOUR_ADDRESS",
    "amount": 50,
    "privateKey": "YOUR_PRIVATE_KEY"
  }'
```

**Response:**
```json
{
  "success": true,
  "address": "YOUR_ADDRESS",
  "stakedAmount": 50,
  "message": "Stake added successfully"
}
```

### 5. Send Transaction
```bash
curl -X POST http://localhost:3001/api/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "from": "YOUR_ADDRESS",
    "to": "RECIPIENT_ADDRESS",
    "amount": 20,
    "privateKey": "YOUR_PRIVATE_KEY"
  }'
```

**Response:**
```json
{
  "success": true,
  "transaction": {
    "id": "...",
    "from": "YOUR_ADDRESS",
    "to": "RECIPIENT_ADDRESS",
    "amount": 20,
    "timestamp": 1704067200000,
    "signature": "..."
  },
  "message": "Transaction added to mempool"
}
```

### 6. View Blockchain
```bash
curl http://localhost:3001/api/chain
```

### 7. View Validators
```bash
curl http://localhost:3001/api/validators
```

**Response:**
```json
{
  "count": 2,
  "validators": [
    {
      "address": "genesis",
      "stake": 100
    },
    {
      "address": "YOUR_ADDRESS",
      "stake": 50
    }
  ]
}
```

## API Reference

### GET /chain
Returns the complete blockchain.

**Response:**
```json
{
  "network": "testnet",
  "length": 5,
  "isValid": true,
  "chain": [...]
}
```

### GET /balance/:address
Get balance for an address.

**Parameters:**
- `address`: Account address

**Response:**
```json
{
  "address": "abc123...",
  "balance": 100
}
```

### POST /transaction
Create and submit a transaction.

**Body:**
```json
{
  "from": "sender_address",
  "to": "receiver_address",
  "amount": 50,
  "privateKey": "sender_private_key"
}
```

**Response:**
```json
{
  "success": true,
  "transaction": {...},
  "message": "Transaction added to mempool"
}
```

### POST /stake
Stake tokens to become a validator.

**Body:**
```json
{
  "address": "your_address",
  "amount": 100,
  "privateKey": "your_private_key"
}
```

**Response:**
```json
{
  "success": true,
  "address": "your_address",
  "stakedAmount": 100,
  "message": "Stake added successfully"
}
```

### GET /validators
List all validators.

**Response:**
```json
{
  "count": 2,
  "validators": [...]
}
```

### POST /faucet
Request test tokens (testnet only).

**Body:**
```json
{
  "address": "your_address"
}
```

**Response:**
```json
{
  "success": true,
  "amount": 100,
  "message": "100 SAYM credited to your_address"
}
```

## Key Concepts Explained

### What is a Blockchain?

A blockchain is a **chain of blocks** where each block contains:
- Transactions
- A link (hash) to the previous block
- A timestamp
```
Block 0 (Genesis)
    ↓
Block 1 (hash of Block 0)
    ↓
Block 2 (hash of Block 1)
    ↓
Block 3 (hash of Block 2)
```

If you try to change Block 1, its hash changes, which breaks Block 2's link, making tampering obvious.

### What is Proof of Stake?

Instead of mining (Proof of Work), validators are chosen based on how much they've staked:

**Example:**
- Alice stakes 100 SAYM → 20% chance
- Bob stakes 400 SAYM → 80% chance

More stake = more responsibility = more block rewards.

### What are Digital Signatures?

When you send SAYM:
1. Create transaction
2. Sign with your **private key** (proves ownership)
3. Network verifies with your **public key**

Like signing a check - only you can sign, everyone can verify.

### What is a Hash?

A hash is a unique fingerprint for data:
```
Input:  "Hello"
Hash:   "185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969"

Input:  "hello" (lowercase)
Hash:   "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
```

Tiny change = completely different hash.

## Configuration

### Testnet (testnet.json)
```json
{
  "network": "testnet",
  "port": 3001,
  "initialSupply": 10000000,
  "blockTime": 5000,
  "minStake": 10,
  "genesisValidator": "genesis",
  "faucetEnabled": true,
  "faucetAmount": 100
}
```

### Mainnet (mainnet.json)
```json
{
  "network": "mainnet",
  "port": 3000,
  "initialSupply": 1000000,
  "blockTime": 10000,
  "minStake": 100,
  "genesisValidator": "genesis",
  "faucetEnabled": false
}
```

## Limitations

Phase 1 has several limitations (fixed in Phase 2 & 3):

1. **Single Node**: No peer-to-peer networking
2. **Manual Mining**: Blocks created on-demand, not automatic
3. **In-Memory State**: Some state not persisted properly
4. **No Slashing**: Validators can't be penalized
5. **No Unstaking**: Can't withdraw staked tokens
6. **Basic Security**: Educational, not production-ready

## Testing

Run the automated test:
```bash
chmod +x tests/test-phase1.sh
./tests/test-phase1.sh
```

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process
lsof -i :3001
kill -9 <PID>
```

### Database Locked
```bash
# Delete data directory
rm -rf data/
npm run testnet
```

### Balance Not Updating
Wait 5 seconds for the next block to be created.

## Next Steps

Phase 1 provides the foundation. Continue to:
- **Phase 2**: Adds P2P networking, validator rewards, slashing, and multi-node support
- **Phase 3**: Adds smart contracts and deterministic state management

## License

MIT

## Author

Sayman Blockchain Project

## Version

1.0.0 - Phase 1 Complete