import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import elliptic from 'elliptic';

const EC = elliptic.ec;
const ec = new EC('secp256k1');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.FAUCET_PORT || 10000;
const API_BASE = process.env.API_BASE || 'https://sayman.onrender.com/api';
const FAUCET_AMOUNT = parseInt(process.env.FAUCET_AMOUNT) || 100;

class FaucetWallet {
  constructor() {
    const seed = 'sayman-faucet-seed-2024';
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    
    const keyPair = ec.keyFromPrivate(hash);
    this.privateKey = keyPair.getPrivate('hex');
    this.publicKey = keyPair.getPublic('hex');
    
    const pubKeyHash = crypto.createHash('sha256').update(this.publicKey).digest('hex');
    this.address = pubKeyHash.substring(0, 40);
    
    console.log(`🚰 Faucet Address: ${this.address}`);
    console.log(`🔑 Public Key: ${this.publicKey.substring(0, 20)}...`);
  }

  async signTransaction(txData) {
    const keyPair = ec.keyFromPrivate(this.privateKey);
    
    const signData = {
      type: txData.type,
      data: txData.data,
      timestamp: txData.timestamp,
      gasLimit: txData.gasLimit,
      gasPrice: txData.gasPrice,
      nonce: txData.nonce
    };
    
    const dataString = JSON.stringify(signData);
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    const signature = keyPair.sign(hash);
    
    return signature.toDER('hex');
  }
}

const faucetWallet = new FaucetWallet();
const cooldowns = new Map();

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    faucet: faucetWallet.address,
    publicKey: faucetWallet.publicKey
  });
});

// Info endpoint - ADDED
app.get('/info', async (req, res) => {
  try {
    // Get faucet balance from blockchain
    const balanceRes = await fetch(`${API_BASE}/address/${faucetWallet.address}`);
    let balance = 0;
    
    if (balanceRes.ok) {
      const data = await balanceRes.json();
      balance = data.balance || 0;
    }
    
    res.json({
      address: faucetWallet.address,
      publicKey: faucetWallet.publicKey,
      balance: balance,
      amount: FAUCET_AMOUNT,
      cooldown: 600000,
      cooldownMinutes: 10,
      apiBase: API_BASE
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch faucet info',
      address: faucetWallet.address,
      amount: FAUCET_AMOUNT
    });
  }
});

// Faucet endpoint
app.post('/faucet', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address || address.length !== 40) {
      return res.status(400).json({ error: 'Invalid address format' });
    }
    
    const now = Date.now();
    const lastClaim = cooldowns.get(address);
    const cooldownTime = 600000;
    
    if (lastClaim && (now - lastClaim) < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - (now - lastClaim)) / 1000 / 60);
      return res.status(429).json({ 
        error: `Please wait ${remainingTime} minutes before claiming again` 
      });
    }
    
    console.log(`🚰 Faucet request for: ${address}`);
    
    // Get faucet balance and nonce
    const balanceRes = await fetch(`${API_BASE}/address/${faucetWallet.address}`);
    if (!balanceRes.ok) {
      console.error('Failed to get faucet balance:', balanceRes.status);
      return res.status(500).json({ error: 'Failed to connect to blockchain' });
    }
    
    const balanceData = await balanceRes.json();
    console.log(`💰 Faucet balance: ${balanceData.balance} SAYM, nonce: ${balanceData.nonce}`);
    
    if (balanceData.balance < FAUCET_AMOUNT) {
      return res.status(500).json({ error: 'Faucet is empty, please try again later' });
    }
    
    const nonce = balanceData.nonce || 0;
    
    // Create transaction
    const txData = {
      type: 'TRANSFER',
      data: { 
        from: faucetWallet.address, 
        to: address, 
        amount: FAUCET_AMOUNT 
      },
      timestamp: Date.now(),
      gasLimit: 50000,
      gasPrice: 1,
      nonce: nonce
    };
    
    console.log('📝 Transaction data:', JSON.stringify(txData, null, 2));
    
    // Sign transaction
    const signature = await faucetWallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: faucetWallet.publicKey
    };
    
    console.log('✍️  Signed transaction, broadcasting...');
    
    // Broadcast transaction
    const broadcastRes = await fetch(`${API_BASE}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });
    
    const result = await broadcastRes.json();
    console.log('📡 Broadcast result:', result);
    
    if (result.success) {
      cooldowns.set(address, now);
      console.log(`✅ Faucet sent ${FAUCET_AMOUNT} SAYM to ${address}`);
      
      res.json({ 
        success: true, 
        amount: FAUCET_AMOUNT,
        txId: result.txId,
        message: `${FAUCET_AMOUNT} SAYM sent successfully`
      });
    } else {
      console.error('❌ Broadcast failed:', result.error);
      res.status(400).json({ error: result.error || 'Transaction failed' });
    }
    
  } catch (error) {
    console.error('❌ Faucet error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚰 Faucet server running on port ${PORT}`);
  console.log(`📡 API: ${API_BASE}`);
  console.log(`💰 Amount: ${FAUCET_AMOUNT} SAYM`);
  console.log(`🔑 Address: ${faucetWallet.address}`);
});