import express from 'express';
import Transaction from '../core/transaction.js';
import crypto from 'crypto';

function createRouter(blockchain, p2pServer, config) {
  const router = express.Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      blocks: blockchain.chain.length,
      uptime: process.uptime()
    });
  });

  // Stats
  router.get('/stats', (req, res) => {
    const stats = blockchain.getStats();
    res.json(stats);
  });

  // Network stats
  router.get('/network/stats', (req, res) => {
    const stats = blockchain.getStats();
    const p2pStats = p2pServer ? p2pServer.getNetworkStats() : { peers: 0, peerList: [] };
    
    let avgBlockTime = config.blockTime;
    if (blockchain.chain.length > 10) {
      const recent = blockchain.chain.slice(-10);
      const timeDiff = recent[recent.length - 1].timestamp - recent[0].timestamp;
      avgBlockTime = timeDiff / 9;
    }
    
    res.json({
      network: stats.network,
      chainId: stats.chainId,
      blockHeight: stats.blocks,
      validators: stats.validators,
      totalStake: stats.totalStake,
      mempool: stats.mempool,
      contracts: stats.contracts,
      peers: p2pStats.peers,
      peerList: p2pStats.peerList,
      nodeId: p2pStats.nodeId,
      mode: p2pStats.mode,
      averageBlockTime: Math.round(avgBlockTime),
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  });

  // Peers
  router.get('/network/peers', (req, res) => {
    if (!p2pServer) {
      return res.json({ peers: [] });
    }
    
    const p2pStats = p2pServer.getNetworkStats();
    res.json({
      count: p2pStats.peers,
      peers: p2pStats.peerList
    });
  });

  // Network info
  router.get('/network', (req, res) => {
    res.json({
      network: config.networkName,
      chainId: config.chainId,
      blockTime: config.blockTime,
      blockReward: config.blockReward,
      minStake: config.minStake,
      faucetEnabled: config.faucetEnabled,
      faucetAmount: config.faucetAmount,
      gasLimits: config.gasLimits,
      gasCosts: config.gasCosts
    });
  });

  // Balance
  router.get('/balance/:address', (req, res) => {
    try {
      const { address } = req.params;
      const balance = blockchain.state.getBalance(address);
      const stake = blockchain.state.getStake(address);
      const nonce = blockchain.state.getNonce(address);
      
      res.json({
        address,
        balance,
        stake,
        nonce
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Address detailed info
  router.get('/address/:address', (req, res) => {
    try {
      const { address } = req.params;
      const balance = blockchain.state.getBalance(address);
      const stake = blockchain.state.getStake(address);
      const nonce = blockchain.state.getNonce(address);
      
      const transactions = [];
      for (const block of blockchain.chain) {
        for (const tx of block.transactions) {
          if (tx.data && (tx.data.from === address || tx.data.to === address)) {
            transactions.push({
              ...tx.toJSON(),
              blockIndex: block.index,
              timestamp: block.timestamp
            });
          }
        }
      }
      
      res.json({
        address,
        balance,
        stake,
        nonce,
        transactions: transactions.slice(-20)
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Blocks (paginated)
  router.get('/blocks', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const start = (page - 1) * limit;
    const end = start + limit;
    
    const blocks = blockchain.chain
      .slice()
      .reverse()
      .slice(start, end)
      .map(b => b.toJSON());
    
    res.json({
      blocks,
      total: blockchain.chain.length,
      page,
      limit
    });
  });

  // Single block
  router.get('/blocks/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const block = blockchain.chain[index];
    
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }
    
    res.json(block.toJSON());
  });

  // Validators
  router.get('/validators', (req, res) => {
    const validators = blockchain.pos.getAllValidators();
    const totalStake = blockchain.pos.getTotalStake();
    
    const validatorList = validators.map(v => ({
      address: v.address,
      stake: v.stake,
      percentage: totalStake > 0 ? ((v.stake / totalStake) * 100).toFixed(2) : 0,
      missedBlocks: v.missedBlocks
    }));
    
    const estimatedAPR = totalStake > 0 
      ? ((config.blockReward * 365 * 24 * 60 * 12) / totalStake * 100).toFixed(2)
      : 0;
    
    res.json({
      validators: validatorList,
      totalValidators: validators.length,
      totalStake,
      estimatedAPR: parseFloat(estimatedAPR)
    });
  });

  // Mempool
  router.get('/mempool', (req, res) => {
    res.json({
      size: blockchain.mempool.length,
      transactions: blockchain.mempool.map(tx => tx.toJSON())
    });
  });

  // Contracts
  router.get('/contracts', (req, res) => {
    const contracts = [];
    for (const [address, contract] of blockchain.contracts.contracts) {
      contracts.push({
        address,
        owner: contract.owner,
        codeSize: contract.code.length
      });
    }
    
    res.json({ contracts });
  });

  // Faucet
  router.post('/faucet', (req, res) => {
    if (!config.faucetEnabled) {
      return res.status(403).json({ 
        error: 'Faucet is disabled on this network' 
      });
    }
    
    const { address } = req.body;
    
    if (!address || address.length !== 40) {
      return res.status(400).json({ error: 'Invalid address' });
    }
    
    // Simple faucet implementation
    const faucetAddress = Object.keys(config.genesisAllocations || {})[0];
    
    if (!faucetAddress) {
      return res.status(503).json({ error: 'Faucet not configured' });
    }
    
    const balance = blockchain.state.getBalance(faucetAddress);
    
    if (balance < config.faucetAmount) {
      return res.status(503).json({ error: 'Faucet is empty' });
    }
    
    res.json({
      success: true,
      message: 'Use the standalone faucet service',
      faucetUrl: 'https://sayman-faucet.onrender.com'
    });
  });

  // Gas estimation
  router.post('/estimate-gas', (req, res) => {
    try {
      const { type, data } = req.body;
      const estimatedGas = blockchain.gasCalculator.calculateGas(type, data);
      const recommendedGasLimit = Math.ceil(estimatedGas * 1.2);
      
      res.json({
        estimatedGas,
        recommendedGasLimit,
        minGasPrice: config.gasLimits.minGasPrice
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Broadcast transaction
  router.post('/broadcast', (req, res) => {
    try {
      const { type, data, timestamp, signature, publicKey, gasLimit, gasPrice, nonce } = req.body;
      
      // Derive address from public key
      const derivedAddress = crypto
        .createHash('sha256')
        .update(publicKey)
        .digest('hex')
        .substring(0, 40);
      
      // Verify address matches
      if (data.from && derivedAddress !== data.from) {
        return res.status(400).json({ 
          error: 'Address does not match public key' 
        });
      }
      
      // Store public key
      blockchain.state.setPublicKey(derivedAddress, publicKey);
      
      // Create transaction
      const tx = new Transaction({
        type,
        data,
        timestamp,
        gasLimit,
        gasPrice,
        nonce,
        signature
      });
      
      // Validate transaction
      if (!tx.isValid(blockchain.state.publicKeys)) {
        return res.status(400).json({ error: 'Invalid signature' });
      }
      
      // Validate nonce
      const expectedNonce = blockchain.state.getNonce(data.from || derivedAddress);
      if (nonce !== expectedNonce) {
        return res.status(400).json({ 
          error: `Invalid nonce. Expected: ${expectedNonce}, Got: ${nonce}` 
        });
      }
      
      // Check balance
      const address = data.from || derivedAddress;
      const balance = blockchain.state.getBalance(address);
      const maxGasCost = gasLimit * gasPrice;
      const totalCost = (data.amount || 0) + maxGasCost;
      
      if (balance < totalCost) {
        return res.status(400).json({ 
          error: `Insufficient balance. Required: ${totalCost}, Available: ${balance}` 
        });
      }
      
      // Add to mempool
      blockchain.mempool.push(tx);
      
      // Broadcast to peers
      if (p2pServer) {
        p2pServer.broadcastTransaction(tx);
      }
      
      res.json({
        success: true,
        txId: tx.id,
        gasLimit,
        gasPrice,
        maxGasCost
      });
      
    } catch (error) {
      console.error('Broadcast error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

export default createRouter;