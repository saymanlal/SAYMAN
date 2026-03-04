# Sayman Blockchain - Phase 6: FINAL PRODUCTION RELEASE

![Phase](https://img.shields.io/badge/Phase-6-blue)
![Status](https://img.shields.io/badge/Status-Complete-green)
![Gas](https://img.shields.io/badge/Gas-Model-orange)
![CLI](https://img.shields.io/badge/CLI-Available-purple)

## 🎉 Final Release

Phase 6 is the **complete, production-ready educational blockchain** with:
- ✅ Deterministic gas model
- ✅ Execution limits & sandboxing
- ✅ Anti-spam protections
- ✅ Nonce-based replay protection
- ✅ Full-featured CLI tool
- ✅ Automatic documentation generator
- ✅ Complete Web3 UI

---

## What's New in Phase 6

### ⛽ Gas Model

**Every transaction now requires gas:**
```javascript
{
  type: "TRANSFER",
  data: { from, to, amount },
  gasLimit: 50000,      // Maximum gas allowed
  gasPrice: 1,          // Price per gas unit
  nonce: 0              // Sequential per address
}
```

**Gas Costs:**
- TRANSFER: 21 gas
- STAKE/UNSTAKE: 50 gas
- CONTRACT_DEPLOY: 500 + (code_size / 10) gas
- CONTRACT_CALL: 100 + execution gas
- State Read: 5 gas per read
- State Write: 20 gas per write

**Why Gas Matters:**
- Prevents infinite loops in contracts
- Economic cost for network usage
- Rewards validators for computation
- Protects against spam

### 🔒 Execution Limits

Contracts are sandboxed with strict limits:
- **Max Execution Time**: 50ms
- **Max State Size**: 50KB per contract
- **Max Instructions**: 10,000 operations
- **No Recursion**: Beyond depth limit

If a contract exceeds limits:
- Transaction reverts
- Gas is still consumed (up to limit)
- Block remains valid

### 🛡️ Anti-Spam Protections

**1. Nonce System**
Every address has a sequential nonce:
```javascript
address: "abc123..."
nonce: 0  // First transaction
nonce: 1  // Second transaction
nonce: 2  // Third transaction
```

Transactions with wrong nonce are rejected.

**2. Rate Limiting**
- Max 10 transactions per minute per address
- Prevents mempool flooding

**3. Mempool Limits**
- Maximum 1,000 pending transactions
- Oldest transactions dropped when full

**4. Minimum Gas Price**
- Floor price: 1 wei per gas
- Prevents zero-cost spam

### 🖥️ CLI Tool

Full-featured command-line interface:
```bash
# Install
cd cli
npm install
npm link

# Usage
sayman wallet create
sayman balance
sayman send <to> <amount>
sayman stake <amount>
sayman validators
sayman network
```

**Features:**
- Local wallet management
- Client-side transaction signing
- Gas estimation
- Pretty terminal output
- Works with testnet & mainnet

### 📚 Auto Documentation

Generate live network docs:
```bash
npm run docs
```

Produces `docs/NETWORK_INFO.md` with:
- Current network stats
- Gas configuration
- Validator list
- API endpoints
- Economics breakdown

---

## Installation
```bash
# Install dependencies
npm install

# Install CLI (optional)
npm run install-cli
```

---

## Running the Network

### Testnet
```bash
npm run testnet
```

### Mainnet
```bash
npm run mainnet
```

### Multi-Node
```bash
# Terminal 1
npm run node1

# Terminal 2
npm run node2

# Terminal 3
npm run node3
```

---

## Using the CLI

### Wallet Management
```bash
# Create new wallet
sayman wallet create

# Import existing wallet
sayman wallet import <privateKey>

# Show wallet info
sayman wallet info

# Export private key
sayman wallet export
```

### Check Balance
```bash
# Your wallet
sayman balance

# Any address
sayman balance 0xabc123...
```

### Send Transactions
```bash
# Basic send
sayman send 0xabc123... 100

# With custom gas
sayman send 0xabc123... 100 --gas-limit 30000 --gas-price 2
```

### Staking
```bash
# Stake tokens
sayman stake 500

# Unstake
sayman unstake

# Both support custom gas params
sayman stake 500 --gas-limit 120000 --gas-price 1
```

### Smart Contracts
```bash
# Deploy contract
sayman deploy contracts/counter.js

# Call contract method
sayman call 0xcontract123... increment '{}'
sayman call 0xcontract123... setValue '{"value": 42}'

# With custom gas
sayman call 0xcontract123... increment '{}' --gas-limit 200000
```

### Network Info
```bash
# Show network details
sayman network

# List validators
sayman validators

# Estimate gas
sayman estimate TRANSFER '{"from":"0x...","to":"0x...","amount":100}'
```

### Configuration
```bash
# Set API endpoint
sayman config http://localhost:3001/api
```

---

## Gas Model Explained

### How Gas Works

1. **Set Gas Parameters**
```javascript
   gasLimit: 50000   // Max gas willing to spend
   gasPrice: 1       // Price per unit
```

2. **Transaction Executes**
   - Gas consumed: 21 (for transfer)
   - Actual cost: 21 × 1 = 21 wei

3. **Validator Receives Fee**
   - REWARD_FEE transaction created
   - Validator gets 21 wei

4. **Unused Gas Refunded**
   - You paid for 50,000
   - Used only 21
   - You're only charged 21

### Gas Estimation

Before sending a transaction:
```bash
sayman estimate TRANSFER '{"from":"0xabc","to":"0xdef","amount":100}'
```

Returns:
```
Estimated Gas:         21
Recommended Limit:     26  (20% buffer)
Min Gas Price:         1
Est. Cost (min price): 26 wei
```

### Contract Gas

Contracts consume gas dynamically:
```javascript
function expensiveOperation() {
  // Each operation costs gas
  state.value = 1;        // 20 gas (write)
  let x = state.value;    // 5 gas (read)
  
  for (let i = 0; i < 100; i++) {
    state.array.push(i);  // 20 gas × 100 = 2000 gas
  }
}
```

Total: ~2,025 gas + base (100) = 2,125 gas

If gasLimit < 2,125: **Transaction fails, gas consumed.**

---

## Nonce System

### What is a Nonce?

A **nonce** (number used once) is a sequential counter per address.

**Example:**
```
Address: 0xabc123...
Nonce: 0  → First transaction
Nonce: 1  → Second transaction
Nonce: 2  → Third transaction
```

### Why Nonces?

**Prevents Replay Attacks:**

Without nonces:
```
1. Alice sends Bob 100 SAYM
2. Attacker captures the signed transaction
3. Attacker broadcasts it again
4. Bob receives another 100 SAYM (theft!)
```

With nonces:
```
1. Alice sends Bob 100 SAYM (nonce: 0)
2. Attacker captures transaction
3. Attacker tries to replay
4. Network rejects: "Nonce 0 already used, expecting nonce 1"
```

### Getting Your Nonce
```bash
# CLI
sayman balance
# Shows: Nonce: 5

# API
curl http://localhost:3000/api/address/0xabc123...
# Returns: { "nonce": 5, ... }
```

### Transaction Order

Transactions **must** be in order:
```
✅ Correct:
- Transaction with nonce 0
- Transaction with nonce 1
- Transaction with nonce 2

❌ Wrong:
- Transaction with nonce 0
- Transaction with nonce 2  ← Rejected! (expecting 1)
- Transaction with nonce 1
```

---

## Anti-Spam Protections

### 1. Nonce System
- Sequential per address
- Prevents replay attacks
- Ensures transaction ordering

### 2. Gas Fees
- Economic cost per transaction
- Prevents free spam
- Rewards validators

### 3. Rate Limiting
- Max 10 tx per minute per address
- Prevents flooding
- Automatic cleanup

### 4. Mempool Limits
- Max 1,000 pending transactions
- FIFO eviction when full
- Prevents memory exhaustion

### 5. Minimum Gas Price
- Floor: 1 wei per gas
- Can't send zero-cost transactions
- Protects network resources

### 6. Execution Limits
- Max 50ms execution time
- Max 10,000 instructions
- Max 50KB state per contract
- Prevents DoS via computation

---

## Contract Execution Limits

### Time Limit: 50ms
```javascript
// ❌ This will timeout
function infiniteLoop() {
  while(true) {
    state.x++;
  }
}
```

**Result:** Transaction reverts after 50ms, gas consumed.

### Instruction Limit: 10,000
```javascript
// ❌ This exceeds instruction limit
function tooManyOps() {
  for (let i = 0; i < 100000; i++) {
    state.data.push(i);  // 100k instructions
  }
}
```

**Result:** Throws "Execution limit exceeded", gas consumed.

### State Limit: 50KB
```javascript
// ❌ This exceeds state size
function bloat() {
  state.hugeArray = new Array(100000).fill('data');
}
```

**Result:** Contract state too large, transaction fails.

### Gas Limit
```javascript
// If gasLimit = 1000
function expensive() {
  for (let i = 0; i < 1000; i++) {
    state.x = i;  // 20 gas each = 20,000 gas total
  }
}
```

**Result:** Out of gas at iteration 50, transaction reverts.

---

## Deterministic Replay

**All Phase 6 features are deterministic:**

### State Rebuilds Include:
- ✅ Balances
- ✅ Stakes
- ✅ Nonces
- ✅ Validator set
- ✅ Contract states
- ✅ Gas fees paid
- ✅ Rewards distributed

### Test Determinism:
```bash
# 1. Run node, do transactions
npm start

# 2. Check state
curl http://localhost:3000/api/stats
# Note: blocks, validators, stakes

# 3. Stop node
Ctrl+C

# 4. Restart
npm start

# 5. Verify identical state
curl http://localhost:3000/api/stats
# Should match exactly!
```

---

## API Changes (Phase 6)

### New Fields in Transactions
```json
{
  "type": "TRANSFER",
  "data": {...},
  "gasLimit": 50000,
  "gasPrice": 1,
  "nonce": 0,
  "signature": {...},
  "publicKey": "..."
}
```

### New Endpoints

**POST /api/estimate-gas**
```bash
curl -X POST http://localhost:3000/api/estimate-gas \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TRANSFER",
    "data": {"from":"0x...","to":"0x...","amount":100}
  }'
```

Response:
```json
{
  "estimatedGas": 21,
  "recommendedGasLimit": 26,
  "minGasPrice": 1
}
```

**GET /api/address/:address**

Now includes nonce:
```json
{
  "address": "0xabc...",
  "balance": 1000,
  "stake": 500,
  "nonce": 5,
  "transactions": [...]
}
```

---

## Smart Contract Examples

### Gas-Efficient Counter
```javascript
function increment() {
  // Efficient: single write
  state.count = (state.count || 0) + 1;
  // Cost: ~20 gas
}
```

### Gas-Heavy Counter
```javascript
function inefficientIncrement() {
  // Inefficient: multiple operations
  let current = state.count || 0;      // 5 gas
  let temp = current;                   // 1 gas
  temp = temp + 1;                      // 1 gas
  state.count = temp;                   // 20 gas
  state.lastUpdate = Date.now();        // ❌ Non-deterministic!
  // Cost: ~27 gas (and fails!)
}
```

### Batch Operations
```javascript
function batchMint(users, amount) {
  // Gas cost: 20 × users.length
  for (let user of users) {
    state.balances[user] = (state.balances[user] || 0) + amount;
  }
  
  // 100 users = 2,000 gas
  // Need gasLimit >= 2,100
}
```

---

## Economics

### Gas Fees Distribution
```
User sends transaction:
  Amount: 100 SAYM
  Gas Limit: 50,000
  Gas Price: 1
  
Transaction executes:
  Gas Used: 21
  Gas Fee: 21 × 1 = 21 wei
  
User pays:
  Transfer: 100 SAYM
  Gas: 21 wei
  Total: 100.000000000000000021 SAYM
  
Validator receives:
  Block Reward: 10 SAYM (from protocol)
  Gas Fee: 21 wei (from user)
  Total: 10.000000000000000021 SAYM
```

### Validator Income
```
Assumptions:
- Block time: 5 seconds
- Block reward: 10 SAYM
- Average gas per block: 1,000,000
- Average gas price: 1 wei
- 1 SAYM = 10^18 wei

Per block:
  Reward: 10 SAYM
  Fees: 1,000,000 wei = 0.000001 SAYM
  Total: 10.000001 SAYM

Per day (17,280 blocks):
  Reward: 172,800 SAYM
  Fees: ~17 SAYM
  Total: ~172,817 SAYM

If validator has 10% of stake:
  Daily income: ~17,282 SAYM
  Yearly: ~6.3M SAYM
```

---

## Testing Phase 6

### Test Script
```bash
chmod +x test-phase6.sh
./test-phase6.sh
```

### Manual Testing

**1. Gas Validation**
```bash
# Should succeed
sayman send 0xabc... 10 --gas-limit 30 --gas-price 1

# Should fail (gas too low)
sayman send 0xabc... 10 --gas-limit 10 --gas-price 1
```

**2. Nonce Validation**
```bash
# Get current nonce
sayman balance
# Nonce: 5

# Try wrong nonce (will fail)
# Modify CLI to send nonce: 10
# Error: "Invalid nonce. Expected: 5, Got: 10"
```

**3. Rate Limiting**
```bash
# Send 15 transactions rapidly
for i in {1..15}; do
  sayman send 0xabc... 1
done

# Last 5 should fail with "Rate limit exceeded"
```

**4. Contract Execution Limits**
```javascript
// contracts/infinite.js
function bad() {
  while(true) {}  // Infinite loop
}

// Deploy
sayman deploy contracts/infinite.js

// Call (will timeout after 50ms)
sayman call 0xcontract... bad '{}'
// Error: "Execution limit exceeded: timeout"
```

**5. Deterministic Rebuild**
```bash
# Run node, do many transactions
# Stop node (Ctrl+C)
# Delete database
rm -rf data/

# Restart and verify state matches
npm start
```

---

## Project Structure
```
sayman-phase6/
├── config/
│   ├── testnet.js
│   ├── mainnet.js
│   └── index.js
│
├── core/
│   ├── blockchain.js      ✨ Gas execution
│   ├── block.js           ✨ Gas tracking
│   ├── transaction.js     ✨ Gas + nonce
│   ├── state.js           ✨ Nonce management
│   ├── pos.js
│   ├── contracts.js       ✨ Execution limits
│   ├── gas.js             ✨ NEW: Gas calculator
│   └── nonce.js           ✨ NEW: Nonce manager
│
├── api/
│   └── routes.js          ✨ Gas estimation endpoint
│
├── p2p/
│   └── server.js
│
├── wallet/
│   └── wallet.js
│
├── frontend/
│   ├── index.html         ✨ Gas UI
│   ├── style.css
│   ├── app.js             ✨ Gas integration
│   └── crypto-client.js   ✨ Nonce signing
│
├── cli/                   ✨ NEW: CLI tool
│   ├── sayman-cli.js
│   ├── wallet-cli.js
│   └── package.json
│
├── scripts/               ✨ NEW: Docs generator
│   └── generateDocs.js
│
├── docs/                  ✨ NEW: Auto-generated
│   └── NETWORK_INFO.md
│
├── server.js
├── package.json
└── README-PHASE6.md
```

---

## Migration from Phase 5

### Breaking Changes

**1. Transactions now require gas:**
```javascript
// Old (Phase 5)
{
  type: "TRANSFER",
  data: {...},
  signature: {...}
}

// New (Phase 6)
{
  type: "TRANSFER",
  data: {...},
  gasLimit: 50000,    // REQUIRED
  gasPrice: 1,        // REQUIRED
  nonce: 0,           // REQUIRED
  signature: {...}
}
```

**2. Nonce required:**
- Must fetch nonce before creating transaction
- Transactions must be sequential

**3. Gas fees deducted:**
- Balance checks now include gas cost
- Validators receive gas fees

### Database Migration

Phase 6 changes state structure (adds nonces).

**To migrate:**
```bash
# Backup old data
cp -r data/ data_backup/

# Delete old database
rm -rf data/

# Restart (rebuilds from genesis)
npm start
```

All transactions will replay with nonce tracking.

---

## Security Considerations

### What Phase 6 Protects Against

✅ **Replay Attacks** - Nonce system  
✅ **Spam** - Gas fees + rate limiting  
✅ **DoS via Computation** - Execution limits  
✅ **Memory Exhaustion** - State size limits  
✅ **Infinite Loops** - Instruction counting  
✅ **Mempool Flooding** - Size limits  
✅ **Zero-Cost Attacks** - Minimum gas price  

### What Phase 6 Does NOT Protect

❌ **51% Attacks** - Need more validators  
❌ **MEV** - No MEV protection built-in  
❌ **Front-Running** - Transactions visible in mempool  
❌ **Sybil Attacks** - Low barrier to entry  

**This is educational. Not production-ready for real value.**

---

## Performance

### Benchmarks (Testnet)

**Transaction Processing:**
- TRANSFER: ~21 gas (< 1ms)
- STAKE: ~50 gas (< 1ms)
- CONTRACT_DEPLOY: ~500-5000 gas (5-50ms)
- CONTRACT_CALL: ~100-10000 gas (10-50ms)

**Block Production:**
- Max transactions per block: Limited by gas
- Max gas per block: 10,000,000
- Practical limit: ~200-500 transactions/block

**Throughput:**
- Block time: 5s (testnet)
- TPS: ~40-100 (testnet)
- Can be improved by:
  - Reducing block time
  - Increasing block gas limit
  - Optimizing gas costs

---

## Troubleshooting

### "Invalid nonce"
```
Error: Invalid nonce. Expected: 5, Got: 3
```

**Solution:** Fetch current nonce before sending:
```bash
sayman balance  # Check nonce
```

### "Out of gas"
```
Error: Out of gas
```

**Solution:** Increase gas limit:
```bash
sayman send 0x... 100 --gas-limit 100000
```

### "Gas limit too low"
```
Error: Gas limit too low. Minimum: 21
```

**Solution:** Use recommended gas from estimation:
```bash
sayman estimate TRANSFER '{...}'
```

### "Rate limit exceeded"
```
Error: Rate limit exceeded. Please wait.
```

**Solution:** Wait 1 minute and retry.

### "Execution limit exceeded"
```
Error: Execution limit exceeded: timeout
```

**Solution:** Optimize contract code or break into multiple transactions.

---

## Production Checklist

Before deploying to production:

- [ ] Use mainnet configuration
- [ ] Set appropriate gas costs
- [ ] Configure gas limits
- [ ] Set up monitoring
- [ ] Enable rate limiting
- [ ] Configure proper genesis
- [ ] Test gas estimation
- [ ] Test nonce handling
- [ ] Test execution limits
- [ ] Verify deterministic replay
- [ ] Security audit
- [ ] Load testing
- [ ] Documentation review

---

## License

MIT

## Version

6.0.0 - Phase 6 Complete (FINAL)

---

## Conclusion

**Phase 6 is the complete, production-grade educational blockchain.**

Features achieved:
- ✅ Deterministic state replay
- ✅ Client-side cryptography
- ✅ Gas model & execution limits
- ✅ Anti-spam protections
- ✅ Smart contracts with sandboxing
- ✅ Multi-node P2P network
- ✅ Full explorer UI
- ✅ CLI tool
- ✅ Auto documentation
- ✅ Testnet/Mainnet separation

**This is the FINAL educational release.**

Use it to learn, experiment, and understand blockchain technology at a deep level.

---

**Sayman Blockchain - Phase 6**  
*Educational Blockchain - Production Architecture*

Built with ❤️ for learning and innovation

🎓 Perfect for understanding blockchain internals  
🔧 Real architecture patterns from production systems  
🚀 Complete from genesis to smart contracts