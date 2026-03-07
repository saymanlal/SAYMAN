#!/bin/bash

echo "=========================================="
echo "🚀 SAYMAN RENDER.COM DEPLOYMENT"
echo "Complete FREE 24/7 Blockchain Deployment"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}📋 Pre-Deployment Checklist:${NC}"
echo ""
echo "✓ Node.js project with package.json"
echo "✓ Git repository initialized"
echo "✓ GitHub account created"
echo "✓ All code committed to Git"
echo ""

read -p "Press Enter to continue..."

echo ""
echo -e "${YELLOW}Step 1: Prepare Repository${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if git repo exists
if [ ! -d .git ]; then
  echo "Initializing Git repository..."
  git init
  git add .
  git commit -m "Initial commit - Sayman Phase 7"
  echo -e "${GREEN}✓ Git repository initialized${NC}"
else
  echo -e "${GREEN}✓ Git repository exists${NC}"
fi

# Create .gitignore if not exists
if [ ! -f .gitignore ]; then
  echo "Creating .gitignore..."
  cat > .gitignore <<EOF
node_modules/
data/
logs/
*.log
.env
.DS_Store
*.key
*.pem
EOF
  git add .gitignore
  git commit -m "Add .gitignore"
  echo -e "${GREEN}✓ .gitignore created${NC}"
fi

# Create render.yaml
echo ""
echo "Creating render.yaml configuration..."
cat > render.yaml <<'EOF'
services:
  # Main Blockchain Validator Node
  - type: web
    name: sayman-validator
    env: node
    region: oregon
    plan: free
    buildCommand: npm install
    startCommand: node server.js --network public-testnet --mode validator
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: P2P_PORT
        value: 6001
    healthCheckPath: /api/stats
    
  # Full Node + Explorer UI
  - type: web
    name: sayman-explorer
    env: node
    region: oregon
    plan: free
    buildCommand: npm install
    startCommand: node server.js --network public-testnet --mode fullnode
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: P2P_PORT
        value: 6002
    healthCheckPath: /api/stats
    
  # Faucet Server
  - type: web
    name: sayman-faucet
    env: node
    region: oregon
    plan: free
    buildCommand: cd faucet && npm install
    startCommand: cd faucet && node server.js
    envVars:
      - key: FAUCET_PORT
        value: 10000
      - key: FAUCET_AMOUNT
        value: 100
    healthCheckPath: /health
EOF

git add render.yaml
git commit -m "Add Render.com deployment configuration"
echo -e "${GREEN}✓ render.yaml created${NC}"

# Create Procfile as backup
echo ""
echo "Creating Procfile (backup)..."
cat > Procfile <<EOF
web: node server.js --network public-testnet --mode validator
EOF

git add Procfile
git commit -m "Add Procfile"
echo -e "${GREEN}✓ Procfile created${NC}"

# Ensure package.json has correct scripts
echo ""
echo "Updating package.json..."
node -e "
const fs = require('fs');
const pkg = require('./package.json');
pkg.scripts = pkg.scripts || {};
pkg.scripts.start = 'node server.js';
pkg.engines = pkg.engines || {};
pkg.engines.node = '>=20.0.0';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"
git add package.json
git commit -m "Update package.json for Render deployment"
echo -e "${GREEN}✓ package.json updated${NC}"

echo ""
echo -e "${YELLOW}Step 2: Push to GitHub${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if GitHub remote exists
if git remote | grep -q origin; then
  echo -e "${GREEN}✓ GitHub remote exists${NC}"
  echo ""
  read -p "Push to GitHub? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git push origin main || git push origin master
    echo -e "${GREEN}✓ Pushed to GitHub${NC}"
  fi
else
  echo -e "${YELLOW}⚠ No GitHub remote found${NC}"
  echo ""
  echo "Please create a GitHub repository and add it as remote:"
  echo ""
  echo "1. Go to: https://github.com/new"
  echo "2. Create repository: sayman-blockchain"
  echo "3. Run these commands:"
  echo ""
  echo -e "${BLUE}git remote add origin https://github.com/YOUR_USERNAME/sayman-blockchain.git${NC}"
  echo -e "${BLUE}git branch -M main${NC}"
  echo -e "${BLUE}git push -u origin main${NC}"
  echo ""
  read -p "Press Enter after pushing to GitHub..."
fi

echo ""
echo -e "${YELLOW}Step 3: Deploy to Render.com${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Follow these steps:"
echo ""
echo -e "${PURPLE}1. Go to: https://render.com${NC}"
echo ""
echo -e "${PURPLE}2. Click 'Get Started for Free'${NC}"
echo "   - Sign up with GitHub (NO credit card needed)"
echo ""
echo -e "${PURPLE}3. Click 'New +' → 'Blueprint'${NC}"
echo ""
echo -e "${PURPLE}4. Connect your repository:${NC}"
echo "   - Select: sayman-blockchain"
echo "   - Render will detect render.yaml"
echo ""
echo -e "${PURPLE}5. Click 'Apply'${NC}"
echo "   - Render creates 3 services automatically:"
echo "     • sayman-validator (Main Node)"
echo "     • sayman-explorer (Explorer UI)"
echo "     • sayman-faucet (Faucet Service)"
echo ""
echo -e "${PURPLE}6. Wait for deployment (5-10 minutes)${NC}"
echo ""
echo -e "${PURPLE}7. Get your URLs:${NC}"
echo "   - Validator: https://sayman-validator.onrender.com"
echo "   - Explorer: https://sayman-explorer.onrender.com"
echo "   - Faucet: https://sayman-faucet.onrender.com"
echo ""

echo ""
echo -e "${GREEN}=========================================="
echo -e "✅ PREPARATION COMPLETE!"
echo -e "==========================================${NC}"
echo ""
echo "Next: Deploy on Render.com"
echo ""
echo -e "${BLUE}Open in browser:${NC}"
echo "https://render.com"
echo ""

# Open browser (optional)
read -p "Open Render.com in browser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if command -v xdg-open &> /dev/null; then
    xdg-open "https://render.com" 2>/dev/null
  elif command -v open &> /dev/null; then
    open "https://render.com"
  else
    echo "Please open manually: https://render.com"
  fi
fi

echo ""
echo -e "${YELLOW}After deployment, update faucet API URL:${NC}"
echo ""
echo "1. Go to Render Dashboard"
echo "2. Select 'sayman-faucet' service"
echo "3. Click 'Environment'"
echo "4. Update API_BASE to:"
echo "   https://sayman-validator.onrender.com/api"
echo "5. Save (will redeploy automatically)"
echo ""