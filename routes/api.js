import express from 'express';
import Transaction from '../core/transaction.js';
import Wallet from '../core/wallet.js';

function createRouter(blockchain, p2pServer = null) {
  const router = express.Router();

  router.get('/chain', (req, res) => {
    res.json({
      network: blockchain.config.network,
      length: blockchain.chain.length,
      isValid: blockchain.isValid(),
      chain: blockchain.getChain()
    });
  });

  router.get('/stats', (req, res) => {
    res.json(blockchain.getStats());
  });

  router.get('/balance/:address', (req, res) => {
    const { address } = req.params;
    const balance = blockchain.getBalance(address);
    const validator = blockchain.stakeManager.getValidator(address);
    
    res.json({
      address,
      balance,
      staked: validator ? validator.stake : 0,
      totalRewards: validator ? validator.totalRewards : 0
    });
  });

  router.post('/transaction', (req, res) => {
    try {
      const { from, to, amount, privateKey } = req.body;

      if (!from || !to || !amount || !privateKey) {
        return res.status(400).json({
          error: 'Missing required fields: from, to, amount, privateKey'
        });
      }

      const wallet = Wallet.import(privateKey);
      
      if (wallet.getAddress() !== from) {
        return res.status(400).json({
          error: 'Private key does not match from address'
        });
      }

      const tx = new Transaction(from, to, parseFloat(amount));
      tx.sign(wallet);

      blockchain.addTransaction(tx, wallet.getPublicKey());

      // Broadcast to peers
      if (p2pServer) {
        p2pServer.broadcastTransaction(tx);
      }

      res.json({
        success: true,
        transaction: tx.toJSON(),
        message: 'Transaction added to mempool'
      });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  });

  router.post('/stake', (req, res) => {
    try {
      const { address, amount, privateKey } = req.body;

      if (!address || !amount || !privateKey) {
        return res.status(400).json({
          error: 'Missing required fields: address, amount, privateKey'
        });
      }

      const wallet = Wallet.import(privateKey);
      
      if (wallet.getAddress() !== address) {
        return res.status(400).json({
          error: 'Private key does not match address'
        });
      }

      const validator = blockchain.addStake(address, parseFloat(amount), wallet.getPublicKey());

      res.json({
        success: true,
        validator: validator.toJSON(),
        message: 'Stake added successfully'
      });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  });

  router.post('/unstake', (req, res) => {
    try {
      const { address, privateKey } = req.body;

      if (!address || !privateKey) {
        return res.status(400).json({
          error: 'Missing required fields: address, privateKey'
        });
      }

      const wallet = Wallet.import(privateKey);
      
      if (wallet.getAddress() !== address) {
        return res.status(400).json({
          error: 'Private key does not match address'
        });
      }

      const unlockBlock = blockchain.unstake(address);

      res.json({
        success: true,
        message: `Unstake initiated. Funds will be available at block ${unlockBlock}`,
        unlockBlock,
        currentBlock: blockchain.chain.length
      });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  });

  router.post('/withdraw', (req, res) => {
    try {
      const { address, privateKey } = req.body;

      if (!address || !privateKey) {
        return res.status(400).json({
          error: 'Missing required fields: address, privateKey'
        });
      }

      const wallet = Wallet.import(privateKey);
      
      if (wallet.getAddress() !== address) {
        return res.status(400).json({
          error: 'Private key does not match address'
        });
      }

      const amount = blockchain.withdrawStake(address);

      res.json({
        success: true,
        amount,
        message: `${amount} SAYM withdrawn successfully`
      });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  });

  router.get('/validators', (req, res) => {
    const validators = blockchain.getValidators();
    res.json({
      count: validators.length,
      validators
    });
  });

  router.get('/validators/all', (req, res) => {
    const validators = blockchain.getAllValidators();
    res.json({
      count: validators.length,
      validators
    });
  });

  router.get('/validator/:address', (req, res) => {
    const { address } = req.params;
    const validator = blockchain.stakeManager.getValidator(address);
    
    if (!validator) {
      return res.status(404).json({
        error: 'Validator not found'
      });
    }

    res.json(validator.toJSON());
  });

  router.post('/faucet', (req, res) => {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({
          error: 'Address required'
        });
      }

      const tx = blockchain.faucet(address);

      res.json({
        success: true,
        transaction: tx.toJSON(),
        amount: blockchain.config.faucetAmount,
        message: `${blockchain.config.faucetAmount} SAYM credited to ${address} (pending in mempool)`
      });
    } catch (error) {
      res.status(400).json({
        error: error.message
      });
    }
  });

  router.get('/mempool', (req, res) => {
    res.json({
      size: blockchain.getMempoolSize(),
      transactions: blockchain.mempool.map(tx => tx.toJSON())
    });
  });

  router.post('/mine', async (req, res) => {
    if (blockchain.config.network !== 'testnet') {
      return res.status(403).json({
        error: 'Manual mining only allowed on testnet'
      });
    }

    try {
      const block = await blockchain.createBlock();
      
      if (!block) {
        return res.json({
          success: false,
          message: 'No transactions in mempool or no validators available'
        });
      }

      // Broadcast block to peers
      if (p2pServer) {
        p2pServer.broadcastBlock(block);
      }

      res.json({
        success: true,
        block: block.toJSON(),
        message: `Block #${block.index} mined successfully`
      });
    } catch (error) {
      res.status(500).json({
        error: error.message
      });
    }
  });

  return router;
}

export default createRouter;