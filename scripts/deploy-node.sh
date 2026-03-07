#!/bin/bash

echo "=========================================="
echo "SAYMAN NODE DEPLOYMENT SCRIPT"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
  echo -e "${RED}❌ Please don't run as root${NC}"
  exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}❌ Node.js 20+ required. Current: $(node -v)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
npm install

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ npm install failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Dependencies installed${NC}"

# Install CLI
echo -e "\n${YELLOW}Installing CLI tool...${NC}"
cd cli && npm install && npm link
cd ..
echo -e "${GREEN}✓ CLI installed${NC}"

# Install Faucet
echo -e "\n${YELLOW}Installing Faucet...${NC}"
cd faucet && npm install
cd ..
echo -e "${GREEN}✓ Faucet installed${NC}"

# Setup systemd service (optional)
read -p "Setup systemd service? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n${YELLOW}Setting up systemd service...${NC}"
  
  # Get current directory
  DIR=$(pwd)
  
  # Create service file
  sudo tee /etc/systemd/system/sayman.service > /dev/null <<EOF
[Unit]
Description=Sayman Blockchain Node
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$DIR
ExecStart=/usr/bin/node server.js --network public-testnet --mode fullnode
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable sayman
  
  echo -e "${GREEN}✓ Systemd service created${NC}"
  echo -e "${BLUE}Start with: sudo systemctl start sayman${NC}"
  echo -e "${BLUE}Check status: sudo systemctl status sayman${NC}"
  echo -e "${BLUE}View logs: sudo journalctl -u sayman -f${NC}"
fi

# Firewall setup
read -p "Configure firewall? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo -e "\n${YELLOW}Configuring firewall...${NC}"
  
  # UFW (Ubuntu)
  if command -v ufw &> /dev/null; then
    sudo ufw allow 3000/tcp comment 'Sayman API'
    sudo ufw allow 6001/tcp comment 'Sayman P2P'
    sudo ufw allow 4000/tcp comment 'Sayman Faucet'
    echo -e "${GREEN}✓ UFW rules added${NC}"
  fi
  
  # Firewalld (CentOS/RHEL)
  if command -v firewall-cmd &> /dev/null; then
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --permanent --add-port=6001/tcp
    sudo firewall-cmd --permanent --add-port=4000/tcp
    sudo firewall-cmd --reload
    echo -e "${GREEN}✓ Firewalld rules added${NC}"
  fi
fi

echo ""
echo -e "${GREEN}=========================================="
echo -e "✅ DEPLOYMENT COMPLETE!"
echo -e "==========================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start a validator node:"
echo "   npm run public-validator"
echo ""
echo "2. Start a full node:"
echo "   npm run public-fullnode -- --bootstrap YOUR_BOOTSTRAP_IP:6001"
echo ""
echo "3. Start the faucet (separate terminal):"
echo "   npm run faucet"
echo ""
echo "4. Access the explorer:"
echo "   http://localhost:3000"
echo ""
echo "5. Use the CLI:"
echo "   sayman network"
echo "   sayman validators"
echo ""