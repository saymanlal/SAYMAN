import express from 'express';
import Transaction from '../core/transaction.js';
import Wallet from '../wallet/wallet.js';

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

  router.get('/blocks/:index', (req, res) => {
    const index = parseInt(req.params.index);
    const block = blockchain.chain[index];
    
    if (!block) {
      return res.status(404).json({ error: 'Block not found' });
    }

    res.json(block.toJSON());
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

  // Send transaction
  router.post('/send', (req, res) => {
    try {
      const { from, to, amount, privateKey } = req.body;

      if (!from || !to || !amount || !privateKey) {
        return res.status(400).json({
          error: 'Missing required fields'
        });
      }

      const wallet = Wallet.import(privateKey);
      
      if (wallet.address !== from) {
        return res.status(400).json({
          error: 'Private key does not match from address'
        });
      }

      const tx = Transaction.createTransfer(from, to, parseFloat(amount));
      tx.sign(wallet);

      blockchain.addTransaction(tx, wallet.publicKey);
      
      if (p2pServer) {
        p2pServer.broadcastTransaction(tx);
      }

      res.json({
        success: true,
        transaction: tx.toJSON()
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Stake
  router.post('/stake', (req, res) => {
    try {
      const { from, amount, privateKey } = req.body;

      if (!from || !amount || !privateKey) {
        return res.status(400).json({
          error: 'Missing required fields'
        });
      }

      const wallet = Wallet.import(privateKey);
      
      if (wallet.address !== from) {
        return res.status(400).json({
          error: 'Private key does not match address'
        });
      }

      const tx = Transaction.createStake(from, parseFloat(amount));
      tx.sign(wallet);

      blockchain.addTransaction(tx, wallet.publicKey);
      
      if (p2pServer) {
        p2pServer.broadcastTransaction(tx);
      }

      res.json({
        success: true,
        transaction: tx.toJSON()
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Unstake
  router.post('/unstake', (req, res) => {
    try {
      const { from, privateKey } = req.body;

      if (!from || !privateKey) {
        return res.status(400).json({
          error: 'Missing required fields'
        });
      }

      const wallet = Wallet.import(privateKey);
      
      if (wallet.address !== from) {
        return res.status(400).json({
          error: 'Private key does not match address'
        });
      }

      const tx = Transaction.createUnstake(from);
      tx.sign(wallet);

      blockchain.addTransaction(tx, wallet.publicKey);
      
      if (p2pServer) {
        p2pServer.broadcastTransaction(tx);
      }

      const unlockBlock = blockchain.chain.length + blockchain.config.unstakeDelay;

      res.json({
        success: true,
        transaction: tx.toJSON(),
        unlockBlock
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Deploy contract
  router.post('/deploy', (req, res) => {
    try {
      const { from, code, privateKey } = req.body;

      if (!from || !code || !privateKey) {
        return res.status(400).json({
          error: 'Missing required fields'
        });
      }

      const wallet = Wallet.import(privateKey);
      
      if (wallet.address !== from) {
        return res.status(400).json({
          error: 'Private key does not match address'
        });
      }

      const tx = Transaction.createContractDeploy(from, code);
      tx.sign(wallet);

      blockchain.addTransaction(tx, wallet.publicKey);
      
      if (p2pServer) {
        p2pServer.broadcastTransaction(tx);
      }

      res.json({
        success: true,
        transaction: tx.toJSON()
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Call contract
  router.post('/call', (req, res) => {
    try {
      const { from, contractAddress, method, args, privateKey } = req.body;

      if (!from || !contractAddress || !method || !privateKey) {
        return res.status(400).json({
          error: 'Missing required fields'
        });
      }

      const wallet = Wallet.import(privateKey);
      
      if (wallet.address !== from) {
        return res.status(400).json({
          error: 'Private key does not match address'
        });
      }

      const tx = Transaction.createContractCall(from, contractAddress, method, args || {});
      tx.sign(wallet);

      blockchain.addTransaction(tx, wallet.publicKey);
      
      if (p2pServer) {
        p2pServer.broadcastTransaction(tx);
      }

      res.json({
        success: true,
        transaction: tx.toJSON()
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Faucet
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