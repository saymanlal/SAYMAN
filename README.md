# Sayman Blockchain - Phase 7: Public Network + Real P2P

![Phase](https://img.shields.io/badge/Phase-7-blue)
![Status](https://img.shields.io/badge/Status-Complete-green)
![Network](https://img.shields.io/badge/Network-Public-orange)
![P2P](https://img.shields.io/badge/P2P-Distributed-purple)

## 🌐 Public Network Release

Phase 7 transforms Sayman into a **true distributed blockchain network** capable of running across multiple machines on the internet.

### What's New in Phase 7

#### 🔗 Real Peer Discovery
- Automatic peer exchange protocol
- Bootstrap node support
- Peer health monitoring
- Chain ID validation
- Maximum peer limits

#### 📡 Multi-Node Distribution
- Run across different machines
- Internet-ready P2P protocol
- Node synchronization
- Block propagation
- Transaction relay

#### 🎯 Node Modes
Three operational modes:
- **Validator**: Produces blocks + validates
- **Full Node**: Validates + relays
- **Observer**: Read-only node

#### 🚰 Public Faucet Server
- Standalone faucet service
- Rate limiting (IP + Address)
- Daily request limits
- RESTful API

#### 📊 Network Dashboard
- Live peer visualization
- Network statistics
- Node information
- Real-time updates

---

## Architecture

### P2P Protocol
```
┌─────────────────────────────────────────┐
│         Bootstrap Node (Validator)       │
│         IP: 35.210.100.12:6001          │
└───────────────┬─────────────────────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│ Node 2 │  │ Node 3 │  │ Node 4 │
│ Full   │  │ Full   │  │Observer│
└────────┘  └────────┘  └────────┘
```

### Message Types

**HELLO**: Node handshake
```json
{
  "type": "HELLO",
  "nodeId": "abc123...",
  "chainId": "sayman-public-testnet-1",
  "version": "7.0.0",
  "port": 6001,
  "mode": "validator",
  "blockHeight": 150
}
```

**PEERS_REQUEST/RESPONSE**: Peer discovery
**NEW_TX**: Transaction broadcast
**NEW_BLOCK**: Block propagation
**CHAIN_SYNC_REQUEST/RESPONSE**: Blockchain sync
**HEARTBEAT**: Keep-alive

---

## Installation

### Prerequisites
- Node.js v20+
- Public IP (for public nodes)
- Open ports: 3000 (API), 6001 (P2P), 4000 (Faucet)

### Quick Install
```bash
# Clone/download project
cd sayman-blockchain

# Install all dependencies
npm run install-all

# Or install individually
npm install
cd cli && npm install && npm link && cd ..
cd faucet && npm install && cd ..
```

### Automated Deployment
```bash
chmod +x scripts/deploy-node.sh
./scripts/deploy-node.sh
```

This script:
- ✅ Checks Node.js version
- ✅ Installs dependencies
- ✅ Sets up CLI
- ✅ Installs faucet
- ✅ (Optional) Creates systemd service
- ✅ (Optional) Configures firewall

---

## Running Nodes

### Local Testing (3 Nodes)
```bash
# Create logs directory
mkdir -p logs

# Run test script
chmod +x scripts/test-p2p.sh
./scripts/test-p2p.sh
```

This starts:
- Node 1 (Validator) on ports 3000/6001
- Node 2 (Full Node) on ports 3001/6002
- Node 3 (Observer) on ports 3002/6003

### Public Testnet

#### Bootstrap Node (First Node)
```bash
npm run public-validator
```

This starts a validator node on public testnet without connecting to peers.

#### Joining Nodes
```bash
# Full node connecting to bootstrap
npm run public-fullnode -- --bootstrap 35.210.100.12:6001

# Observer node connecting to multiple peers
npm run observer -- --network public-testnet --bootstrap 35.210.100.12:6001,40.120.50.30:6002
```

### Custom Configuration
```bash
# Validator with custom ports
PORT=4000 P2P_PORT=7001 node server.js \
  --network public-testnet \
  --mode validator

# Full node with bootstrap
PORT=4001 P2P_PORT=7002 node server.js \
  --network public-testnet \
  --mode fullnode \
  --bootstrap 35.210.100.12:6001

# Observer node
PORT=4002 P2P_PORT=7003 node server.js \
  --network public-testnet \
  --mode observer \
  --bootstrap 35.210.100.12:6001
```

---

## Node Modes

### Validator Mode

**Purpose**: Produce blocks and validate transactions

**Requirements**:
- Staked tokens (min: 500 SAYM on public testnet)
- Reliable uptime
- Good network connection

**Runs**:
```bash
npm run validator
# or
npm run public-validator
```

**Responsibilities**:
- ✅ Produce blocks every 5 seconds
- ✅ Validate transactions
- ✅ Broadcast blocks to network
- ✅ Maintain full blockchain
- ✅ Relay transactions

**Rewards**: Block rewards + gas fees

### Full Node Mode

**Purpose**: Validate and relay without producing blocks

**Requirements**:
- No staking required
- Moderate resources

**Runs**:
```bash
npm run fullnode -- --bootstrap PEER_IP:PORT
# or
npm run public-fullnode -- --bootstrap PEER_IP:PORT
```

**Responsibilities**:
- ✅ Validate all blocks
- ✅ Maintain full blockchain
- ✅ Relay transactions
- ✅ Relay blocks
- ❌ Does NOT produce blocks

**Rewards**: None

### Observer Mode

**Purpose**: Read-only node for explorers/wallets

**Requirements**:
- Minimal resources
- No staking

**Runs**:
```bash
npm run observer -- --bootstrap PEER_IP:PORT
```

**Responsibilities**:
- ✅ Sync blockchain
- ✅ Provide API access
- ❌ Does NOT validate
- ❌ Does NOT relay
- ❌ Does NOT produce blocks

**Use Cases**:
- Block explorers
- Wallet backends
- Analytics services

---

## Public Faucet

### Starting the Faucet
```bash
# Default (connects to localhost:3000)
npm run faucet

# Custom API endpoint
FAUCET_PORT=4000 API_BASE=http://35.210.100.12:3000/api npm run faucet

# With custom amount
FAUCET_AMOUNT=200 npm run faucet
```

### Using the Faucet

**HTTP API:**
```bash
# Request tokens
curl -X POST http://localhost:4000/request \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_WALLET_ADDRESS"}'

# Response
{
  "success": true,
  "amount": 100,
  "txId": "550e8400-...",
  "message": "100 SAYM sent successfully",
  "estimatedTime": "~5-10 seconds"
}
```

**Check faucet status:**
```bash
curl http://localhost:4000/stats

# Response
{
  "faucetAddress": "abc123...",
  "balance": 99500,
  "amountPerRequest": 100,
  "remainingRequests": 995,
  "cooldown": 600,
  "maxDailyPerAddress": 5
}
```

### Rate Limits

- **IP Cooldown**: 10 minutes between requests
- **Address Cooldown**: 10 minutes between requests
- **Daily Limit**: 5 requests per address per 24 hours

---

## Network Discovery

### How Peers Connect

1. **Node starts** with bootstrap peer(s)
2. **Connects to bootstrap** node
3. **Sends HELLO** message with chain ID
4. **Bootstrap validates** chain ID
5. **If valid**, connection accepted
6. **Node requests** peer list
7. **Bootstrap responds** with known peers
8. **Node connects** to discovered peers
9. **Process repeats** until max peers reached

### Peer Exchange Example
```
Node A starts:
  --bootstrap 35.210.100.12:6001

Node A → Bootstrap:
  HELLO {nodeId, chainId, version}

Bootstrap → Node A:
  HELLO {nodeId, chainId, version}

Node A → Bootstrap:
  PEERS_REQUEST

Bootstrap → Node A:
  PEERS_RESPONSE {
    peers: [
      {ip: "40.120.50.30", port: 6002},
      {ip: "52.210.88.15", port: 6003}
    ]
  }

Node A connects to discovered peers
Node A now has 3 connections
```

### Chain Synchronization

When a new node joins with an empty database:
```
1. Node connects to network
2. Receives block #150 announcement
3. Realizes it's behind (has 0 blocks)
4. Sends CHAIN_SYNC_REQUEST {currentHeight: 0}
5. Peer responds with blocks 0-150
6. Node validates each block sequentially
7. Node rebuilds state deterministically
8. Node is now synced at block #150
```

---

## API Endpoints

### Network Statistics

**GET /api/network/stats**
```bash
curl http://localhost:3000/api/network/stats
```

Response:
```json
{
  "network": "Sayman Public Testnet",
  "chainId": "sayman-public-testnet-1",
  "blockHeight": 150,
  "validators": 4,
  "totalStake": 2500,
  "mempool": 5,
  "contracts": 2,
  "peers": 3,
  "peerList": [...],
  "nodeId": "abc123...",
  "mode": "validator",
  "averageBlockTime": 5000,
  "uptime": 3600
}
```

### Peer Information

**GET /api/network/peers**
```bash
curl http://localhost:3000/api/network/peers
```

Response:
```json
{
  "count": 3,
  "peers": [
    {
      "nodeId": "abc123...",
      "ip": "35.210.100.12",
      "port": 6001,
      "chainId": "sayman-public-testnet-1",
      "version": "7.0.0",
      "lastSeen": 1704067200000
    }
  ]
}
```

---

## Network Dashboard

### Accessing the UI

Open browser: `http://localhost:3000`

Click **"Network"** tab to see:

**Network Stats:**
- Connected peers count
- Active validators
- Block height
- Average block time
- Total stake
- Mempool size

**Node Information:**
- Your node ID
- Operating mode
- Uptime
- Network name
- Chain ID

**Peer List:**
- Node IDs
- IP addresses
- Chain IDs
- Versions
- Last seen time

**Auto-updates every 3 seconds**

---

## CLI Usage

### Network Commands
```bash
# View network info
sayman network

# List validators
sayman validators

# Check balance
sayman balance

# Send transaction (relayed across network)
sayman send 0xRECIPIENT 100

# Stake (become validator)
sayman stake 500
```

All transactions are automatically broadcast to connected peers.

---

## Deployment Guide

### Cloud Deployment (AWS/GCP/Azure)

#### 1. Launch Instance

**Specs:**
- 2 vCPU
- 4GB RAM
- 20GB SSD
- Ubuntu 22.04 LTS

#### 2. Configure Firewall

**AWS Security Group:**
```
Inbound Rules:
- Port 3000: 0.0.0.0/0 (API)
- Port 6001: 0.0.0.0/0 (P2P)
- Port 4000: 0.0.0.0/0 (Faucet, optional)
- Port 22: YOUR_IP/32 (SSH)
```

**GCP Firewall Rules:**
```bash
gcloud compute firewall-rules create sayman-api \
  --allow tcp:3000

gcloud compute firewall-rules create sayman-p2p \
  --allow tcp:6001
```

#### 3. Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y build-essential git

# Clone project
git clone https://github.com/yourrepo/sayman.git
cd sayman

# Run deployment script
chmod +x scripts/deploy-node.sh
./scripts/deploy-node.sh
```

#### 4. Start Node
```bash
# Using systemd (recommended)
sudo systemctl start sayman
sudo systemctl status sayman

# Or manually with screen/tmux
screen -S sayman
npm run public-validator
# Ctrl+A, D to detach
```

#### 5. Monitor
```bash
# View logs
sudo journalctl -u sayman -f

# Check peers
curl http://localhost:3000/api/network/peers

# Check status
curl http://localhost:3000/api/network/stats
```

### Multiple Nodes Setup

**Bootstrap Node (Node 1):**
```bash
# Server 1: 35.210.100.12
npm run public-validator
```

**Full Node (Node 2):**
```bash
# Server 2: 40.120.50.30
npm run public-fullnode -- --bootstrap 35.210.100.12:6001
```

**Observer Node (Node 3):**
```bash
# Server 3: 52.210.88.15
npm run observer -- --network public-testnet --bootstrap 35.210.100.12:6001
```

**Faucet Server:**
```bash
# Any server
API_BASE=http://35.210.100.12:3000/api npm run faucet
```

---

## Troubleshooting

### Peers Not Connecting

**Symptom:** Peer count stays at 0

**Check:**
```bash
# Firewall
sudo ufw status
sudo ufw allow 6001/tcp

# Listening
netstat -tuln | grep 6001

# Logs
tail -f logs/node1.log
```

**Solution:**
- Verify firewall rules
- Check bootstrap peer is reachable
- Ensure correct chain ID
- Verify ports are open

### Chain Not Syncing

**Symptom:** Block height not increasing

**Check:**
```bash
curl http://localhost:3000/api/network/stats | jq '.blockHeight'
```

**Solution:**
```bash
# Stop node
pkill -f "node server.js"

# Delete database
rm -rf data/

# Restart with bootstrap
npm run fullnode -- --bootstrap WORKING_PEER:6001
```

### "Chain ID Mismatch"

**Symptom:** Peers rejected with chain ID error

**Cause:** Connecting to wrong network

**Solution:**
- Verify network flag: `--network public-testnet`
- Check config file chain ID
- Ensure all nodes use same network

### High Memory Usage

**Symptom:** Node crashes with OOM

**Solution:**
```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=4096" npm run fullnode
```

### Faucet Empty

**Symptom:** Faucet returns "Faucet is empty"

**Solution:**
```bash
# Check faucet balance
curl http://localhost:4000/stats

# Fund faucet wallet
sayman send FAUCET_ADDRESS 10000
```

---

## Network Configuration

### Public Testnet Settings
```javascript
{
  networkName: 'Sayman Public Testnet',
  chainId: 'sayman-public-testnet-1',
  blockTime: 5000,
  blockReward: 10,
  minStake: 500,
  faucetAmount: 100,
  maxPeers: 50
}
```

### Creating Custom Network

1. Copy `config/public-testnet.js`
2. Modify parameters
3. Change `chainId` (important!)
4. Run with `--network custom`

---

## Security Considerations

### Chain ID Validation ✅
Prevents connecting to wrong networks

### Peer Limits ✅
Max 50 peers prevents DoS

### Rate Limiting ✅
Faucet protects against abuse

### Heartbeat System ✅
Removes stale peers automatically

### Still Missing (Production)
- ❌ Peer reputation system
- ❌ DDoS protection
- ❌ Encrypted connections
- ❌ NAT traversal
- ❌ Sybil attack prevention

**Use for testing/education only**

---

## Performance

### Benchmarks (3-Node Local Network)

- Block propagation: ~100-200ms
- Transaction broadcast: ~50-100ms
- Peer discovery: ~2-5 seconds
- Full chain sync: ~10-30 seconds (1000 blocks)

### Recommended Specs

**Validator:**
- 4 vCPU
- 8GB RAM
- 50GB SSD
- 100 Mbps network

**Full Node:**
- 2 vCPU
- 4GB RAM
- 30GB SSD
- 50 Mbps network

**Observer:**
- 1 vCPU
- 2GB RAM
- 20GB SSD
- 25 Mbps network

---

## Project Structure
```
sayman-phase7/
├── config/
│   ├── testnet.js
│   ├── mainnet.js
│   ├── public-testnet.js    ✨ NEW
│   └── index.js              ✨ Updated
├── core/
│   └── ... (unchanged)
├── p2p/
│   ├── server.js             ✨ Rewritten
│   └── peerManager.js        ✨ NEW
├── faucet/                   ✨ NEW
│   ├── server.js
│   └── package.json
├── scripts/
│   ├── deploy-node.sh        ✨ NEW
│   ├── test-p2p.sh           ✨ NEW
│   └── generateDocs.js
├── frontend/
│   ├── index.html            ✨ Updated (network page)
│   ├── app.js                ✨ Updated (network stats)
│   └── style.css             ✨ Updated
├── server.js                 ✨ Updated (modes, bootstrap)
├── package.json              ✨ Updated
└── README-PHASE7.md          ✨ NEW
```

---

## Migration from Phase 6

### Breaking Changes

**P2P Protocol:**
- New message format
- Chain ID validation
- Node ID generation

**Configuration:**
- New `--mode` flag
- New `--bootstrap` flag
- New `--network` options

### Upgrade Steps
```bash
# 1. Backup
cp -r data/ data_backup/

# 2. Update code
git pull origin phase7

# 3. Install dependencies
npm install
cd faucet && npm install && cd ..

# 4. Clean database (fresh start)
rm -rf data/

# 5. Start with new flags
npm run public-validator
```

---

## License

MIT

## Version

7.0.0 - Phase 7 Complete

---

**Sayman Blockchain - Phase 7**  
*True Distributed Public Network*

Built for real-world P2P blockchain deployment 🌐⛓️