# 🚀 Render.com Deployment - Complete Guide

## What You'll Deploy

1. **Validator Node** - Main blockchain node producing blocks
2. **Explorer** - Full node with web interface
3. **Faucet** - Token distribution service

All **FREE, 24/7, NO credit card required!**

---

## Quick Deploy (5 Minutes)

### Step 1: Prepare Project
```bash
# Run deployment script
chmod +x scripts/render-deploy.sh
./scripts/render-deploy.sh
```

This script:
- ✅ Creates render.yaml
- ✅ Commits to Git
- ✅ Prepares for deployment

### Step 2: Push to GitHub
```bash
# Create GitHub repo first: https://github.com/new
# Name: sayman-blockchain

# Add remote
git remote add origin https://github.com/YOUR_USERNAME/sayman-blockchain.git

# Push
git branch -M main
git push -u origin main
```

### Step 3: Deploy on Render

1. **Go to Render.com**
   - Open: https://render.com
   - Click: **"Get Started for Free"**

2. **Sign Up**
   - Click: **"Sign in with GitHub"**
   - Authorize Render
   - ✅ NO credit card needed!

3. **Create Blueprint**
   - Click: **"New +"** → **"Blueprint"**
   - Select: **"sayman-blockchain"** repo
   - Render detects `render.yaml`
   - Click: **"Apply"**

4. **Wait for Deployment**
   - Validator deploys first (~3-5 min)
   - Explorer deploys second (~3-5 min)
   - Faucet deploys third (~3-5 min)
   - Total: ~10-15 minutes

5. **Get Your URLs**
```
   Validator: https://sayman-validator.onrender.com
   Explorer:  https://sayman-explorer.onrender.com
   Faucet:    https://sayman-faucet.onrender.com
```

---

## Manual Deployment (Alternative)

If blueprint doesn't work, deploy each service manually:

### Deploy Validator

1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repo: `sayman-blockchain`
3. Settings:
   - **Name**: `sayman-validator`
   - **Region**: Oregon
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js --network public-testnet --mode validator`
   - **Plan**: Free
4. Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `P2P_PORT` = `6001`
5. Click **"Create Web Service"**

### Deploy Explorer

1. Click **"New +"** → **"Web Service"**
2. Same repo: `sayman-blockchain`
3. Settings:
   - **Name**: `sayman-explorer`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js --network public-testnet --mode fullnode --bootstrap sayman-validator.onrender.com:6001`
4. Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `P2P_PORT` = `6002`
5. Click **"Create Web Service"**

### Deploy Faucet

1. Click **"New +"** → **"Web Service"**
2. Same repo: `sayman-blockchain`
3. Settings:
   - **Name**: `sayman-faucet`
   - **Root Directory**: `faucet`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
4. Environment Variables:
   - `API_BASE` = `https://sayman-validator.onrender.com/api`
   - `FAUCET_PORT` = `10000`
   - `FAUCET_AMOUNT` = `100`
5. Click **"Create Web Service"**

---

## Post-Deployment Configuration

### 1. Update Faucet API URL

After validator is deployed:

1. Go to **Dashboard** → **sayman-faucet**
2. Click **"Environment"**
3. Update `API_BASE`:
```
   https://sayman-validator.onrender.com/api
```
4. Click **"Save Changes"**
5. Faucet auto-redeploys (~2 min)

### 2. Update Explorer Bootstrap

1. Go to **Dashboard** → **sayman-explorer**
2. Click **"Settings"**
3. Update **Start Command**:
```
   node server.js --network public-testnet --mode fullnode --bootstrap sayman-validator.onrender.com:6001
```
4. Click **"Save Changes"**
5. Manual deploy required

### 3. Verify Deployment

Check each service:
```bash
# Validator
curl https://sayman-validator.onrender.com/api/stats

# Explorer
curl https://sayman-explorer.onrender.com/api/stats

# Faucet
curl https://sayman-faucet.onrender.com/health
```

---

## Accessing Your Blockchain

### Explorer UI

Open in browser:
```
https://sayman-explorer.onrender.com
```

Features:
- 📊 Live network stats
- 📦 Block explorer
- 💰 Wallet interface
- 🌐 Network dashboard
- 👥 Validator list

### Faucet

Request test tokens:
```bash
curl -X POST https://sayman-faucet.onrender.com/request \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_WALLET_ADDRESS"}'
```

Or use the Explorer UI → Faucet tab

### CLI Connection

Connect your local CLI to the public network:
```bash
# Configure endpoint
sayman config https://sayman-validator.onrender.com/api

# Check network
sayman network

# Request from faucet (get wallet address first)
sayman wallet create
# Copy your address

# Use faucet via browser or curl
# Then check balance
sayman balance
```

---

## Keeping Services Active

### The Problem

Render free tier services sleep after **15 minutes** of inactivity.

### The Solution

Use **UptimeRobot** (free) to ping services every 5 minutes:

1. Go to: https://uptimerobot.com
2. Sign up (free, no credit card)
3. Click **"Add New Monitor"**
4. Settings:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: Sayman Validator
   - **URL**: `https://sayman-validator.onrender.com/api/stats`
   - **Monitoring Interval**: 5 minutes
5. Repeat for Explorer and Faucet
6. Done! Services stay awake 24/7

---

## Monitoring & Logs

### Render Dashboard

1. Go to: https://dashboard.render.com
2. Select service (e.g., sayman-validator)
3. View:
   - **Logs**: Real-time logs
   - **Metrics**: CPU, Memory usage
   - **Events**: Deployments, restarts

### View Logs
```bash
# In Render Dashboard
# Click service → "Logs" tab
# Live tail of all logs
```

### Check Service Status
```bash
# Validator
curl https://sayman-validator.onrender.com/api/stats | jq

# Network stats
curl https://sayman-validator.onrender.com/api/network/stats | jq

# Peers
curl https://sayman-validator.onrender.com/api/network/peers | jq
```

---

## Troubleshooting

### Service Won't Start

**Error**: "Build failed" or "Start command failed"

**Solution**:
1. Check logs in Render Dashboard
2. Verify package.json has all dependencies
3. Test locally: `npm install && npm start`
4. Redeploy: Dashboard → "Manual Deploy" → "Deploy latest commit"

### Can't Connect to Validator

**Error**: Explorer or Faucet can't reach validator

**Solution**:
1. Ensure validator is deployed and running
2. Check validator URL in environment variables
3. Use full URL: `https://sayman-validator.onrender.com`
4. Not `http://` or internal URL

### Faucet Returns Error

**Error**: "Faucet is empty" or "Internal server error"

**Solution**:
1. Check faucet logs
2. Verify API_BASE is correct
3. Fund faucet wallet:
```bash
   # Get faucet address from logs
   # Send tokens via CLI or another wallet
```

### Service Keeps Sleeping

**Problem**: Service inactive after 15 min

**Solution**:
- Set up UptimeRobot (see "Keeping Services Active")
- Or upgrade to paid plan ($7/month for 24/7)

### Out of Free Hours

**Error**: "Service suspended - out of free hours"

**Solution**:
- Render free tier: 750 hours/month
- 750h ÷ 30 days = 25 hours/day
- Should be enough for 3 services
- If exceeded, services pause until next month
- Workaround: Create 2nd account for more services

---

## Performance Optimization

### Reduce Resource Usage

1. **Use Observer Mode** for explorer:
```
   Start Command: node server.js --network public-testnet --mode observer --bootstrap sayman-validator.onrender.com:6001
```
   Uses less CPU/memory

2. **Disable Unnecessary Features**:
```javascript
   // In config/public-testnet.js
   maxPeers: 10,  // Reduce from 50
   blockTime: 10000,  // Increase to 10s
```

3. **Optimize Database**:
   Render uses ephemeral storage, so keep blockchain small

---

## Upgrading & Redeploying

### Auto-Deploy (Recommended)

1. Enable auto-deploy in Render:
   - Dashboard → Service → Settings
   - **Auto-Deploy**: Yes
2. Every `git push` triggers deployment

### Manual Deploy

1. Make code changes locally
2. Commit and push to GitHub:
```bash
   git add .
   git commit -m "Update feature X"
   git push origin main
```
3. Render auto-deploys in ~2-3 minutes

### Force Redeploy

In Render Dashboard:
1. Select service
2. Click **"Manual Deploy"**
3. Select **"Deploy latest commit"**

---

## Custom Domain (Optional)

### Free Domain (.onrender.com)

You get: `sayman-validator.onrender.com`

### Custom Domain

1. Buy domain (Namecheap, GoDaddy)
2. In Render Dashboard:
   - Service → Settings
   - **Custom Domains**
   - Add domain: `blockchain.yourdomain.com`
3. Update DNS:
```
   CNAME blockchain sayman-validator.onrender.com
```
4. SSL auto-configured (free)

---

## Cost Analysis

### Render Free Tier

| Resource | Free Tier | Your Usage |
|----------|-----------|------------|
| Services | Unlimited | 3 services |
| Hours | 750/month | ~720/month (3×24×30) |
| RAM | 512MB each | 512MB × 3 |
| CPU | Shared | Shared |
| Bandwidth | 100GB/month | ~5-10GB |
| Storage | Ephemeral | OK for blockchain |
| **Cost** | **$0/month** | **$0** |

### Staying Within Free Tier

✅ **You're good!**
- 3 services × 24h × 30 days = 2,160 hours needed
- BUT services can sleep when inactive
- With UptimeRobot pinging: uses ~750 hours
- Stays FREE ✅

---

## Going Public

### Share Your Blockchain
```
🌐 Sayman Public Testnet

Explorer: https://sayman-explorer.onrender.com
Faucet: https://sayman-faucet.onrender.com
Bootstrap: sayman-validator.onrender.com:6001

Connect with CLI:
$ sayman config https://sayman-validator.onrender.com/api
$ sayman network
```

### Invite Others

Anyone can connect:
```bash
# Full node
npm run fullnode -- --bootstrap sayman-validator.onrender.com:6001

# Observer
npm run observer -- --bootstrap sayman-validator.onrender.com:6001
```

---

## Success Checklist

- ✅ Validator deployed and running
- ✅ Explorer accessible in browser
- ✅ Faucet responding to requests
- ✅ Blocks being produced every 5s
- ✅ Services connected via P2P
- ✅ UptimeRobot keeping services awake
- ✅ No costs incurred ($0/month)

---

## 🎉 You're Live!

Your blockchain is now:
- ✅ **Running 24/7**
- ✅ **Publicly accessible**
- ✅ **Completely FREE**
- ✅ **NO credit card required**
- ✅ **Auto-deploying from Git**

**Congrats! You've deployed a real blockchain!** 🚀🎊

---

## Support

- **Render Docs**: https://render.com/docs
- **Community**: https://community.render.com
- **Status**: https://status.render.com

---

**Happy Blockchain Building!** ⛓️💎