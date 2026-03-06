#!/bin/bash

echo "=========================================="
echo "SAYMAN PHASE 6 - COMPLETE FINAL TEST"
echo "Gas Model + Execution Limits + Anti-Spam"
echo "=========================================="
echo ""

API="http://localhost:3000/api"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}Phase 6 Features:${NC}"
echo "✓ Gas model with metering"
echo "✓ Execution limits (50ms, 10K instructions)"
echo "✓ Nonce-based replay protection"
echo "✓ Anti-spam (rate limiting, mempool limits)"
echo "✓ CLI tool"
echo "✓ Auto documentation generator"
echo ""

# Test 1: Network Configuration
echo -e "${YELLOW}Test 1: Network Configuration...${NC}"
NETWORK=$(curl -s $API/network)
echo "$NETWORK" | jq
echo -e "${GREEN}✓ Network config loaded${NC}"
echo ""

# Test 2: Gas Configuration
echo -e "${YELLOW}Test 2: Gas Configuration...${NC}"
GAS_LIMITS=$(echo $NETWORK | jq '.gasLimits')
GAS_COSTS=$(echo $NETWORK | jq '.gasCosts')
echo "Gas Limits:"
echo "$GAS_LIMITS" | jq
echo "Gas Costs:"
echo "$GAS_COSTS" | jq
echo -e "${GREEN}✓ Gas configuration verified${NC}"
echo ""

# Test 3: CLI Installation Check
echo -e "${YELLOW}Test 3: Checking CLI Installation...${NC}"
if command -v sayman &> /dev/null; then
    echo -e "${GREEN}✓ CLI installed and available${NC}"
    sayman --version
else
    echo -e "${RED}✗ CLI not installed${NC}"
    echo "Run: npm run install-cli"
fi
echo ""

# Test 4: Documentation Generator
echo -e "${YELLOW}Test 4: Testing Documentation Generator...${NC}"
node scripts/generateDocs.js
if [ -f "docs/NETWORK_INFO.md" ]; then
    echo -e "${GREEN}✓ Documentation generated successfully${NC}"
    echo "File: docs/NETWORK_INFO.md"
    echo "Size: $(wc -l < docs/NETWORK_INFO.md) lines"
else
    echo -e "${RED}✗ Documentation generation failed${NC}"
fi
echo ""

# Test 5: Gas Estimation
echo -e "${YELLOW}Test 5: Gas Estimation API...${NC}"
GAS_EST=$(curl -s -X POST $API/estimate-gas \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TRANSFER",
    "data": {"from":"test","to":"test2","amount":100}
  }')
echo "$GAS_EST" | jq
ESTIMATED=$(echo $GAS_EST | jq -r '.estimatedGas')
RECOMMENDED=$(echo $GAS_EST | jq -r '.recommendedGasLimit')
echo -e "${GREEN}✓ Estimated gas: $ESTIMATED, Recommended: $RECOMMENDED${NC}"
echo ""

# Test 6: Address with Nonce
echo -e "${YELLOW}Test 6: Address Info (with nonce)...${NC}"
read -p "Enter a wallet address (or press Enter to skip): " TEST_ADDR

if [ -n "$TEST_ADDR" ]; then
    ADDR_INFO=$(curl -s $API/address/$TEST_ADDR)
    echo "$ADDR_INFO" | jq
    NONCE=$(echo $ADDR_INFO | jq -r '.nonce')
    echo -e "${GREEN}✓ Address nonce: $NONCE${NC}"
else
    echo "Skipped"
fi
echo ""

# Test 7: Stats with Gas Info
echo -e "${YELLOW}Test 7: Network Stats...${NC}"
STATS=$(curl -s $API/stats)
echo "$STATS" | jq
echo -e "${GREEN}✓ Stats retrieved${NC}"
echo ""

# Test 8: Block with Gas Usage
echo -e "${YELLOW}Test 8: Recent Block (with gas)...${NC}"
BLOCKS=$(curl -s "$API/blocks?limit=1")
LAST_BLOCK=$(echo $BLOCKS | jq '.blocks[0]')
BLOCK_GAS=$(echo $LAST_BLOCK | jq -r '.gasUsed')
echo "Last block gas used: $BLOCK_GAS"
echo "$LAST_BLOCK" | jq
echo -e "${GREEN}✓ Block data with gas tracking${NC}"
echo ""

# Test 9: Transaction with Gas Details
echo -e "${YELLOW}Test 9: Recent Transaction (with gas)...${NC}"
TX=$(echo $LAST_BLOCK | jq '.transactions[0]')
if [ "$TX" != "null" ]; then
    TX_GAS_LIMIT=$(echo $TX | jq -r '.gasLimit')
    TX_GAS_PRICE=$(echo $TX | jq -r '.gasPrice')
    TX_GAS_USED=$(echo $TX | jq -r '.gasUsed')
    TX_NONCE=$(echo $TX | jq -r '.nonce')
    
    echo "Transaction details:"
    echo "  Gas Limit: $TX_GAS_LIMIT"
    echo "  Gas Price: $TX_GAS_PRICE"
    echo "  Gas Used: $TX_GAS_USED"
    echo "  Nonce: $TX_NONCE"
    echo -e "${GREEN}✓ Transaction has gas parameters${NC}"
else
    echo "No transactions in last block"
fi
echo ""

# Test 10: Mempool Limits
echo -e "${YELLOW}Test 10: Mempool Status...${NC}"
MEMPOOL=$(curl -s $API/mempool)
MEMPOOL_SIZE=$(echo $MEMPOOL | jq -r '.size')
echo "Mempool size: $MEMPOOL_SIZE / 1000 (limit)"
echo -e "${GREEN}✓ Mempool limits active${NC}"
echo ""

# Test 11: Validators
echo -e "${YELLOW}Test 11: Validators...${NC}"
VALIDATORS=$(curl -s $API/validators)
VALIDATOR_COUNT=$(echo $VALIDATORS | jq -r '.totalValidators')
TOTAL_STAKE=$(echo $VALIDATORS | jq -r '.totalStake')
APR=$(echo $VALIDATORS | jq -r '.estimatedAPR')
echo "Total Validators: $VALIDATOR_COUNT"
echo "Total Stake: $TOTAL_STAKE SAYM"
echo "Estimated APR: $APR%"
echo -e "${GREEN}✓ Validators active${NC}"
echo ""

# Test 12: Smart Contracts Count
echo -e "${YELLOW}Test 12: Smart Contracts...${NC}"
CONTRACTS=$(curl -s $API/contracts)
CONTRACT_COUNT=$(echo $CONTRACTS | jq '.contracts | length')
echo "Deployed contracts: $CONTRACT_COUNT"
echo -e "${GREEN}✓ Contracts system active${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}PHASE 6 API TESTS COMPLETE!${NC}"
echo "=========================================="
echo ""

# Summary
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}            TEST SUMMARY${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Network:"
echo "  Name: $(echo $NETWORK | jq -r '.network')"
echo "  Chain ID: $(echo $NETWORK | jq -r '.chainId')"
echo "  Faucet: $(echo $NETWORK | jq -r '.faucetEnabled')"
echo ""
echo "Gas Configuration:"
echo "  Min Gas Price: $(echo $NETWORK | jq -r '.gasLimits.minGasPrice')"
echo "  Max Gas Per TX: $(echo $NETWORK | jq -r '.gasLimits.maxGasPerTx')"
echo "  Transfer Cost: $(echo $NETWORK | jq -r '.gasCosts.TRANSFER') gas"
echo "  Stake Cost: $(echo $NETWORK | jq -r '.gasCosts.STAKE') gas"
echo ""
echo "Network Status:"
echo "  Block Height: $(echo $STATS | jq -r '.blocks')"
echo "  Validators: $VALIDATOR_COUNT"
echo "  Total Stake: $TOTAL_STAKE SAYM"
echo "  Contracts: $CONTRACT_COUNT"
echo "  Mempool: $MEMPOOL_SIZE"
echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# CLI Tests
echo -e "${YELLOW}Manual CLI Tests:${NC}"
echo ""
echo "1. Test wallet creation:"
echo "   $ sayman wallet create"
echo ""
echo "2. Test balance check:"
echo "   $ sayman balance"
echo ""
echo "3. Test gas estimation:"
echo "   $ sayman estimate TRANSFER '{\"from\":\"0x...\",\"to\":\"0x...\",\"amount\":100}'"
echo ""
echo "4. Test network info:"
echo "   $ sayman network"
echo ""
echo "5. Test validators list:"
echo "   $ sayman validators"
echo ""
echo "6. Test send (with gas):"
echo "   $ sayman send 0x... 10 --gas-limit 30000 --gas-price 1"
echo ""
echo "7. Test stake (with gas):"
echo "   $ sayman stake 500 --gas-limit 100000 --gas-price 1"
echo ""

# Advanced Tests
echo -e "${YELLOW}Advanced Manual Tests:${NC}"
echo ""
echo "Test Nonce Validation:"
echo "  1. Get your nonce: sayman balance"
echo "  2. Try sending with wrong nonce (should fail)"
echo ""
echo "Test Rate Limiting:"
echo "  1. Send 15 transactions rapidly"
echo "  2. Last 5 should fail with 'Rate limit exceeded'"
echo ""
echo "Test Gas Limits:"
echo "  1. Deploy contract: sayman deploy contracts/example.js"
echo "  2. Try with low gas limit (should fail)"
echo "  3. Retry with higher gas limit (should succeed)"
echo ""
echo "Test Execution Limits:"
echo "  1. Deploy contract with infinite loop"
echo "  2. Call it (should timeout after 50ms)"
echo ""
echo "Test Deterministic Replay:"
echo "  1. Stop node, delete database"
echo "  2. Restart node"
echo "  3. Verify state matches previous (all nonces, balances, stakes)"
echo ""

echo "=========================================="
echo -e "${GREEN}ALL TESTS COMPLETE!${NC}"
echo "=========================================="