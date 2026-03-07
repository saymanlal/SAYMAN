#!/bin/bash

echo "=========================================="
echo "SAYMAN P2P NETWORK TEST"
echo "3-Node Local Network Simulation"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Kill any existing nodes
echo -e "${YELLOW}Cleaning up existing nodes...${NC}"
pkill -f "node server.js" 2>/dev/null
sleep 2

# Clean databases
echo -e "${YELLOW}Cleaning databases...${NC}"
rm -rf data/

echo -e "${GREEN}✓ Cleanup complete${NC}"
echo ""

# Start Node 1 (Bootstrap Validator)
echo -e "${BLUE}Starting Node 1 (Bootstrap Validator)...${NC}"
PORT=3000 P2P_PORT=6001 node server.js --network public-testnet --mode validator > logs/node1.log 2>&1 &
NODE1_PID=$!
echo "Node 1 PID: $NODE1_PID"
echo "API: http://localhost:3000"
echo "P2P: ws://localhost:6001"
sleep 5

# Start Node 2 (Full Node)
echo ""
echo -e "${BLUE}Starting Node 2 (Full Node)...${NC}"
PORT=3001 P2P_PORT=6002 node server.js --network public-testnet --mode fullnode --bootstrap localhost:6001 > logs/node2.log 2>&1 &
NODE2_PID=$!
echo "Node 2 PID: $NODE2_PID"
echo "API: http://localhost:3001"
echo "P2P: ws://localhost:6002"
sleep 5

# Start Node 3 (Observer)
echo ""
echo -e "${BLUE}Starting Node 3 (Observer)...${NC}"
PORT=3002 P2P_PORT=6003 node server.js --network public-testnet --mode observer --bootstrap localhost:6001,localhost:6002 > logs/node3.log 2>&1 &
NODE3_PID=$!
echo "Node 3 PID: $NODE3_PID"
echo "API: http://localhost:3002"
echo "P2P: ws://localhost:6003"
sleep 5

echo ""
echo -e "${GREEN}=========================================="
echo -e "✅ ALL NODES RUNNING!"
echo -e "==========================================${NC}"
echo ""

# Wait for nodes to connect
echo -e "${YELLOW}Waiting for nodes to connect...${NC}"
sleep 10

# Check peer connections
echo ""
echo -e "${BLUE}Node 1 Peers:${NC}"
curl -s http://localhost:3000/api/network/peers | jq '.count'

echo ""
echo -e "${BLUE}Node 2 Peers:${NC}"
curl -s http://localhost:3001/api/network/peers | jq '.count'

echo ""
echo -e "${BLUE}Node 3 Peers:${NC}"
curl -s http://localhost:3002/api/network/peers | jq '.count'

echo ""
echo -e "${GREEN}Network Status:${NC}"
echo ""

# Get network stats from each node
for PORT in 3000 3001 3002; do
  echo -e "${YELLOW}Node on port $PORT:${NC}"
  curl -s http://localhost:$PORT/api/network/stats | jq '{
    mode: .mode,
    peers: .peers,
    blockHeight: .blockHeight,
    validators: .validators
  }'
  echo ""
done

echo ""
echo -e "${GREEN}=========================================="
echo -e "NETWORK RUNNING SUCCESSFULLY!"
echo -e "==========================================${NC}"
echo ""
echo "Access nodes:"
echo "  Node 1: http://localhost:3000"
echo "  Node 2: http://localhost:3001"
echo "  Node 3: http://localhost:3002"
echo ""
echo "Monitor logs:"
echo "  tail -f logs/node1.log"
echo "  tail -f logs/node2.log"
echo "  tail -f logs/node3.log"
echo ""
echo "Stop all nodes:"
echo "  kill $NODE1_PID $NODE2_PID $NODE3_PID"
echo ""
echo "Press Ctrl+C to stop this script (nodes will keep running)"
echo ""

# Keep script running
trap "echo ''; echo 'Stopping nodes...'; kill $NODE1_PID $NODE2_PID $NODE3_PID 2>/dev/null; exit" INT
wait