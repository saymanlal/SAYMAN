import WebSocket, { WebSocketServer } from 'ws';
import Block from './block.js';
import Transaction from './transaction.js';

const MessageType = {
  CHAIN_REQUEST: 'CHAIN_REQUEST',
  CHAIN_RESPONSE: 'CHAIN_RESPONSE',
  NEW_BLOCK: 'NEW_BLOCK',
  NEW_TRANSACTION: 'NEW_TRANSACTION'
};

class P2PServer {
  constructor(blockchain, port, peers = []) {
    this.blockchain = blockchain;
    this.port = port;
    this.peers = peers;
    this.sockets = [];
  }

  listen() {
    const server = new WebSocketServer({ port: this.port });

    server.on('connection', (socket) => {
      console.log('✓ New peer connected');
      this.initConnection(socket);
    });

    // Connect to peers after a short delay to allow server startup
    setTimeout(() => {
      this.connectToPeers();
    }, 1000);

    console.log(`✓ P2P server listening on port ${this.port}`);
  }

  initConnection(socket) {
    this.sockets.push(socket);
    this.initMessageHandler(socket);
    
    // Send chain request immediately after connection
    setTimeout(() => {
      this.sendChainRequest(socket);
    }, 100);
  }

  initMessageHandler(socket) {
    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleMessage(socket, message);
      } catch (error) {
        console.error('Error parsing message:', error.message);
      }
    });

    socket.on('close', () => {
      console.log('✗ Peer disconnected');
      this.sockets = this.sockets.filter(s => s !== socket);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error.message);
    });
  }

  async handleMessage(socket, message) {
    switch (message.type) {
      case MessageType.CHAIN_REQUEST:
        this.sendChain(socket);
        break;

      case MessageType.CHAIN_RESPONSE:
        await this.handleChainResponse(message.data);
        break;

      case MessageType.NEW_BLOCK:
        await this.handleNewBlock(message.data);
        break;

      case MessageType.NEW_TRANSACTION:
        this.handleNewTransaction(message.data);
        break;
    }
  }

  sendChainRequest(socket) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: MessageType.CHAIN_REQUEST
      }));
    }
  }

  sendChain(socket) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: MessageType.CHAIN_RESPONSE,
        data: this.blockchain.getChain()
      }));
    }
  }

  async handleChainResponse(chainData) {
    if (chainData.length > this.blockchain.chain.length) {
      console.log(`📥 Received longer chain (${chainData.length} blocks vs ${this.blockchain.chain.length})`);
      
      try {
        const newChain = await Promise.all(
          chainData.map(blockData => Block.fromJSON(blockData))
        );

        // Basic validation
        if (this.isValidChain(newChain)) {
          this.blockchain.chain = newChain;
          await this.blockchain.rebuildState();
          await this.blockchain.saveChain();
          console.log('✓ Chain replaced with peer chain');
        } else {
          console.log('✗ Received invalid chain');
        }
      } catch (error) {
        console.error('Error processing chain:', error.message);
      }
    } else if (chainData.length === this.blockchain.chain.length) {
      console.log('✓ Chain is in sync');
    }
  }

  async handleNewBlock(blockData) {
    try {
      const block = await Block.fromJSON(blockData);
      const lastBlock = this.blockchain.getLastBlock();

      if (block.index === lastBlock.index + 1 && 
          block.previousHash === lastBlock.hash) {
        
        this.blockchain.chain.push(block);
        
        // Apply transactions
        for (const tx of block.transactions) {
          this.blockchain.applyTransaction(tx);
        }

        // Remove transactions from mempool
        this.blockchain.mempool = this.blockchain.mempool.filter(
          mempoolTx => !block.transactions.some(blockTx => blockTx.id === mempoolTx.id)
        );

        await this.blockchain.saveChain();
        console.log(`✓ Received new block #${block.index} from peer`);
      }
    } catch (error) {
      console.error('Error handling new block:', error.message);
    }
  }

  handleNewTransaction(txData) {
    try {
      const tx = Transaction.fromJSON(txData);
      
      // Check if transaction already in mempool
      const exists = this.blockchain.mempool.some(
        existingTx => existingTx.id === tx.id
      );

      if (!exists && tx.isValid((addr) => this.blockchain.publicKeys.get(addr))) {
        this.blockchain.mempool.push(tx);
        console.log(`✓ Received transaction ${tx.id.substring(0, 8)}... from peer`);
      }
    } catch (error) {
      console.error('Error handling new transaction:', error.message);
    }
  }

  broadcast(message) {
    this.sockets.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) {
        try {
          socket.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error broadcasting message:', error.message);
        }
      }
    });
  }

  broadcastBlock(block) {
    this.broadcast({
      type: MessageType.NEW_BLOCK,
      data: block.toJSON()
    });
    console.log(`📤 Broadcasted block #${block.index} to ${this.sockets.length} peer(s)`);
  }

  broadcastTransaction(transaction) {
    this.broadcast({
      type: MessageType.NEW_TRANSACTION,
      data: transaction.toJSON()
    });
    console.log(`📤 Broadcasted transaction to ${this.sockets.length} peer(s)`);
  }

  connectToPeers() {
    this.peers.forEach(peer => {
      try {
        const socket = new WebSocket(peer);

        socket.on('open', () => {
          console.log(`✓ Connected to peer: ${peer}`);
          this.initConnection(socket);
        });

        socket.on('error', (error) => {
          console.log(`✗ Failed to connect to peer: ${peer}`);
        });
      } catch (error) {
        console.error(`Error connecting to ${peer}:`, error.message);
      }
    });
  }

  isValidChain(chain) {
    if (chain.length === 0) return false;

    for (let i = 1; i < chain.length; i++) {
      const currentBlock = chain[i];
      const previousBlock = chain[i - 1];

      if (currentBlock.hash !== currentBlock.calculateHash()) {
        return false;
      }

      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }

    return true;
  }
}

export default P2PServer;