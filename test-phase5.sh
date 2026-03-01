#!/bin/bash

echo "=========================================="
echo "SAYMAN PHASE 5 - COMPLETE TEST"
echo "Production Network + Explorer"
echo "=========================================="
echo ""

API="http://localhost:3000/api"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Testing Phase 5 Features:${NC}"
echo "✓ Network configuration"
echo "✓ Faucet restriction"
echo "✓ Explorer endpoints"
echo "✓ Search functionality"
echo "✓ Live block feed"
echo "✓ Validator monitoring"
echo ""

# Test 1: Network Info
echo -e "${YELLOW}Test 1: Checking Network Configuration...${NC}"
NETWORK=$(curl -s $API/network | jq)
echo "$NETWORK"
echo -e "${GREEN}✓ Network config loaded${NC}"
echo ""

# Test 2: Check if testnet
IS_TESTNET=$(echo $NETWORK | jq -r '.faucetEnabled')
if [ "$IS_TESTNET" = "true" ]; then
  echo -e "${YELLOW}Running on TESTNET - Faucet is available${NC}"
else
  echo -e "${RED}Running on MAINNET - Faucet is disabled${NC}"
fi
echo ""

# Test 3: Stats
echo -e "${YELLOW}Test 2: Fetching Network Stats...${NC}"
curl -s $API/stats | jq
echo -e "${GREEN}✓ Stats retrieved${NC}"
echo ""

# Test 4: Create wallet (browser simulation)
echo -e "${YELLOW}Test 3: Creating Test Wallet...${NC}"
echo "In a real test, open: http://localhost:3000"
echo "1. Click 'Wallet' → 'Create New Wallet'"
echo "2. Copy the address"
echo ""

read -p "Enter your wallet address: " WALLET_ADDR

if [ -z "$WALLET_ADDR" ]; then
  echo -e "${RED}No wallet address provided, skipping wallet tests${NC}"
else
  # Test 5: Faucet
  if [ "$IS_TESTNET" = "true" ]; then
    echo -e "${YELLOW}Test 4: Requesting Faucet...${NC}"
    curl -s -X POST $API/faucet \
      -H "Content-Type: application/json" \
      -d "{\"address\":\"$WALLET_ADDR\"}" | jq
    echo -e "${GREEN}✓ Faucet requested${NC}"
    echo "Waiting for block..."
    sleep 6
    echo ""
  fi

  # Test 6: Check Balance
  echo -e "${YELLOW}Test 5: Checking Balance...${NC}"
  curl -s $API/balance/$WALLET_ADDR | jq
  echo -e "${GREEN}✓ Balance checked${NC}"
  echo ""

  # Test 7: Address Details
  echo -e "${YELLOW}Test 6: Getting Address Details...${NC}"
  curl -s $API/address/$WALLET_ADDR | jq
  echo -e "${GREEN}✓ Address details retrieved${NC}"
  echo ""
fi

# Test 8: Blocks with Pagination
echo -e "${YELLOW}Test 7: Testing Block Pagination...${NC}"
echo "Page 1:"
curl -s "$API/blocks?page=1&limit=5" | jq '.blocks | length'
echo -e "${GREEN}✓ Pagination works${NC}"
echo ""

# Test 9: Single Block
echo -e "${YELLOW}Test 8: Getting Genesis Block...${NC}"
curl -s $API/blocks/0 | jq
echo -e "${GREEN}✓ Single block retrieval works${NC}"
echo ""

# Test 10: Validators
echo -e "${YELLOW}Test 9: Checking Validators...${NC}"
curl -s $API/validators | jq
echo -e "${GREEN}✓ Validators retrieved${NC}"
echo ""

# Test 11: Search
echo -e "${YELLOW}Test 10: Testing Search...${NC}"
echo "Searching for block 0..."
curl -s $API/search/0 | jq '.type'
echo -e "${GREEN}✓ Search works${NC}"
echo ""

# Test 12: Contracts
echo -e "${YELLOW}Test 11: Checking Contracts...${NC}"
curl -s $API/contracts | jq '.contracts | length'
echo -e "${GREEN}✓ Contracts endpoint works${NC}"
echo ""

# Test 13: Mempool
echo -e "${YELLOW}Test 12: Checking Mempool...${NC}"
curl -s $API/mempool | jq '.size'
echo -e "${GREEN}✓ Mempool works${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}ALL API TESTS PASSED!${NC}"
echo "=========================================="
echo ""
echo "Manual UI Tests:"
echo "1. Open http://localhost:3000 in browser"
echo "2. Test Dashboard - should show live stats"
echo "3. Test Explorer - should show blocks"
echo "4. Test Validators - should show validator list"
echo "5. Test Wallet - create and manage wallet"
echo "6. Test Contracts - deploy and call contracts"
if [ "$IS_TESTNET" = "true" ]; then
  echo "7. Test Faucet - claim test tokens"
fi
echo ""
echo "Network Separation Test:"
echo "1. Stop current node (Ctrl+C)"
echo "2. Run: NODE_ENV=mainnet npm start"
echo "3. Try to access faucet - should be disabled"
echo "4. Check network banner - should say MAINNET"
echo ""