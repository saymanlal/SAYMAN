import express from 'express';
import Transaction from '../core/transaction.js';
import Wallet from '../core/wallet.js';

function createRouter(blockchain) {
  const router = express.Router();

  router.get('/chain', (req, res) => {
    res.json({
      network: blockchain.config.network,
      length: blockchain.chain.length,
      isValid: blockchain.isValid(),
      chain: blockchain.getChain()
    });
  });

  router.get('/balance/:address', (req, res) => {
    const { address } = req.params;
    const balance = blockchain.getBalance(address);
    res.json({
      address,
      balance
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

      blockchain.addStake(address, parseFloat(amount), wallet.getPublicKey());

      res.json({
        success: true,
        address,
        stakedAmount: parseFloat(amount),
        message: 'Stake added successfully'
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
    try {
      const block = await blockchain.createBlock();
      
      if (!block) {
        return res.json({
          success: false,
          message: 'No transactions in mempool or no validators available'
        });
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