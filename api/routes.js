import express from 'express';
import Transaction from '../core/transaction.js';
import Wallet from '../wallet/wallet.js';
import { v4 as uuidv4 } from 'uuid';

function createRouter(blockchain, p2pServer) {
  const router = express.Router();

  // Stats
  router.get('/stats', (req, res) => {
    res.json(blockchain.getStats());
  });

  // Blocks
  router.get('/blocks', (req, res) => {
    res.json({
      blocks: blockchain.chain.map(b => b.toJSON())
    });
  });

  // Balance
  router.get('/balance/:address', (req, res) => {
    const { address } = req.params;
    const balance = blockchain.state.getBalance(address);
    const stake = blockchain.state.getStake(address);
    const unstaking = blockchain.state.isUnstaking(address);
    const unlockBlock = blockchain.state.getUnlockBlock(address);

    res.json({
      address,
      balance,
      stake,
      unstaking,
      unlockBlock
    });
  });

  // Validators
  router.get('/validators', (req, res) => {
    res.json({
      validators: blockchain.state.getValidators()
    });
  });

  // Contracts
  router.get('/contracts', (req, res) => {
    res.json({
      contracts: blockchain.state.getAllContracts()
    });
  });

  router.get('/contracts/:address', (req, res) => {
    const contract = blockchain.state.getContract(req.params.address);
    
    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json(contract);
  });

  // MAIN ENDPOINT - Broadcast signed transaction
  // This is the ONLY way to submit transactions (proper blockchain architecture)
  router.post('/broadcast', (req, res) => {
    try {
      const { type, data, timestamp, signature, publicKey } = req.body;

      if (!type || !data || !timestamp || !signature || !publicKey) {
        return res.status(400).json({
          error: 'Missing required fields: type, data, timestamp, signature, publicKey'
        });
      }

      // Create transaction from signed data
      const tx = new Transaction(type, data);
      tx.timestamp = timestamp;
      tx.signature = signature;
      tx.id = uuidv4();

      // Store public key for verification
      blockchain.state.setPublicKey(data.from, publicKey);

      // Verify signature (backend verifies, doesn't sign!)
      if (!tx.isValid(blockchain.state.publicKeys)) {
        return res.status(400).json({
          error: 'Invalid signature'
        });
      }

      // Validate transaction based on type
      switch (type) {
        case 'TRANSFER':
          if (blockchain.state.getBalance(data.from) < data.amount) {
            return res.status(400).json({
              error: 'Insufficient balance'
            });
          }
          break;

        case 'STAKE':
          if (blockchain.state.getBalance(data.from) < data.amount) {
            return res.status(400).json({
              error: 'Insufficient balance for staking'
            });
          }
          if (data.amount < blockchain.config.minStake) {
            return res.status(400).json({
              error: `Minimum stake is ${blockchain.config.minStake} SAYM`
            });
          }
          break;

        case 'UNSTAKE':
          if (blockchain.state.getStake(data.from) === 0) {
            return res.status(400).json({
              error: 'No stake to unstake'
            });
          }
          if (blockchain.state.isUnstaking(data.from)) {
            return res.status(400).json({
              error: 'Already unstaking'
            });
          }
          break;

        case 'CONTRACT_DEPLOY':
          if (data.code.length > blockchain.config.maxContractSize) {
            return res.status(400).json({
              error: 'Contract code too large'
            });
          }
          break;

        case 'CONTRACT_CALL':
          const contract = blockchain.state.getContract(data.contractAddress);
          if (!contract) {
            return res.status(400).json({
              error: 'Contract not found'
            });
          }
          break;
      }

      // Add to mempool
      blockchain.mempool.push(tx);

      // Broadcast to peers
      if (p2pServer) {
        p2pServer.broadcastTransaction(tx);
      }

      console.log(`✓ Transaction received: ${type} from ${data.from.substring(0, 8)}...`);

      const response = {
        success: true,
        txId: tx.id,
        message: 'Transaction accepted and added to mempool'
      };

      // Add unlock block for unstake
      if (type === 'UNSTAKE') {
        response.unlockBlock = blockchain.chain.length + blockchain.config.unstakeDelay;
      }

      res.json(response);

    } catch (error) {
      console.error('Broadcast error:', error);
      res.status(400).json({ error: error.message });
    }
  });

  // Faucet (for testing only)
  router.post('/faucet', (req, res) => {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({ error: 'Address required' });
      }

      const tx = Transaction.createTransfer('faucet', address, 1000);
      blockchain.mempool.push(tx);

      res.json({
        success: true,
        amount: 1000,
        message: 'Faucet credited (pending)'
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Mempool
  router.get('/mempool', (req, res) => {
    res.json({
      size: blockchain.mempool.length,
      transactions: blockchain.mempool.map(tx => tx.toJSON())
    });
  });

  return router;
}

export default createRouter;