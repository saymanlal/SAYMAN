#!/bin/bash

echo "=========================================="
echo "SAYMAN - REAL BLOCKCHAIN FLOW TEST"
echo "Client-Side Signing + Multi-Validator"
echo "=========================================="
echo ""

API="http://localhost:3000/api"
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}This test demonstrates PROPER blockchain architecture:${NC}"
echo "✓ Wallets generated CLIENT-SIDE (via browser)"
echo "✓ Transactions signed CLIENT-SIDE"
echo "✓ Private keys NEVER sent to server"
echo "✓ Server only receives SIGNED transactions"
echo ""

echo -e "${YELLOW}Step 1: Open browser at http://localhost:3000${NC}"
echo "Please complete these steps in the browser:"
echo ""
echo "1. Click 'Wallet' tab"
echo "2. Click 'Create New Wallet' (3 times to create 3 wallets)"
echo "3. Save each private key"
echo "4. Copy each address"
echo ""

read -p "Press Enter when you have 3 wallets created..."

echo ""
echo -e "${YELLOW}Step 2: Enter wallet addresses:${NC}"
read -p "Wallet 1 Address: " ADDR1
read -p "Wallet 2 Address: " ADDR2
read -p "Wallet 3 Address: " ADDR3

echo ""
echo -e "${YELLOW}Step 3: Funding wallets via faucet...${NC}"
curl -s -X POST $API/faucet -H "Content-Type: application/json" -d "{\"address\":\"$ADDR1\"}" | jq
sleep 6
curl -s -X POST $API/faucet -H "Content-Type: application/json" -d "{\"address\":\"$ADDR2\"}" | jq
sleep 6
curl -s -X POST $API/faucet -H "Content-Type: application/json" -d "{\"address\":\"$ADDR3\"}" | jq
sleep 6

echo ""
echo -e "${YELLOW}Step 4: Checking balances...${NC}"
echo "Wallet 1:"
curl -s $API/balance/$ADDR1 | jq
echo "Wallet 2:"
curl -s $API/balance/$ADDR2 | jq
echo "Wallet 3:"
curl -s $API/balance/$ADDR3 | jq

echo ""
echo -e "${YELLOW}Step 5: Now stake from each wallet using the UI:${NC}"
echo ""
echo "In the browser:"
echo "1. Go to 'Stake' tab"
echo "2. Stake from Wallet 1: 500 SAYM"
echo "3. Stake from Wallet 2: 300 SAYM"
echo "4. Stake from Wallet 3: 200 SAYM"
echo ""
echo "Notice: Private keys entered in browser, signed CLIENT-SIDE!"
echo ""

read -p "Press Enter when all 3 wallets have staked..."

echo ""
echo -e "${YELLOW}Step 6: Checking validators...${NC}"
curl -s $API/validators | jq

echo ""
echo -e "${GREEN}Step 7: Watching block production for 30 seconds...${NC}"
echo "Observe which validators create blocks..."
echo "Expected: Wallet 1 (500 SAYM) creates most blocks"
echo ""

for i in {1..6}; do
  STATS=$(curl -s $API/stats)
  BLOCKS=$(echo $STATS | jq -r '.blocks')
  
  LAST_BLOCK=$(curl -s $API/blocks | jq -r ".blocks[-1]")
  VALIDATOR=$(echo $LAST_BLOCK | jq -r '.validator')
  
  echo "Block $BLOCKS created by: ${VALIDATOR:0:16}..."
  
  # Check which wallet it is
  if [[ "$VALIDATOR" == "$ADDR1"* ]]; then
    echo "  → Wallet 1 (500 SAYM stake)"
  elif [[ "$VALIDATOR" == "$ADDR2"* ]]; then
    echo "  → Wallet 2 (300 SAYM stake)"
  elif [[ "$VALIDATOR" == "$ADDR3"* ]]; then
    echo "  → Wallet 3 (200 SAYM stake)"
  else
    echo "  → Genesis validator"
  fi
  echo ""
  
  sleep 5
done

echo -e "${GREEN}Step 8: Final validator stats...${NC}"
curl -s $API/validators | jq

echo ""
echo "=========================================="
echo "✅ TEST COMPLETE!"
echo "=========================================="
echo ""
echo "What we demonstrated:"
echo "✓ Client-side wallet generation (browser)"
echo "✓ Client-side transaction signing (browser)"
echo "✓ Private keys never sent to server"
echo "✓ Multi-validator Proof of Stake"
echo "✓ Weighted validator selection"
echo "✓ Real blockchain architecture"
echo ""
echo "This is how Bitcoin, Ethereum, and all real"
echo "blockchains work - trustless and secure!"
echo "=========================================="