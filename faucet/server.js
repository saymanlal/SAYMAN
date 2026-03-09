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
  }

  async signTransaction(txData) {
    const keyPair = ec.keyFromPrivate(this.privateKey);
    const dataString = JSON.stringify(txData);
    const hash = crypto.createHash('sha256').update(dataString).digest('hex');
    const signature = keyPair.sign(hash);
    return signature.toDER('hex');
  }
}

const faucetWallet = new FaucetWallet();
const cooldowns = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', faucet: faucetWallet.address });
});

app.post('/faucet', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address || address.length !== 40) {
      return res.status(400).json({ error: 'Invalid address' });
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
    
    const balanceRes = await fetch(`${API_BASE}/address/${faucetWallet.address}`);
    const balanceData = await balanceRes.json();
    const nonce = balanceData.nonce || 0;
    
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
    
    const signature = await faucetWallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: faucetWallet.publicKey
    };
    
    const broadcastRes = await fetch(`${API_BASE}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });
    
    const result = await broadcastRes.json();
    
    if (result.success) {
      cooldowns.set(address, now);
      res.json({ 
        success: true, 
        amount: FAUCET_AMOUNT,
        txId: result.txId
      });
    } else {
      res.status(400).json({ error: result.error || 'Transaction failed' });
    }
    
  } catch (error) {
    console.error('Faucet error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚰 Faucet server running on port ${PORT}`);
  console.log(`📡 API: ${API_BASE}`);
  console.log(`💰 Amount: ${FAUCET_AMOUNT} SAYM`);
});