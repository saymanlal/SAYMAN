import WebSocket, { WebSocketServer } from 'ws';
import Block from '../core/block.js';
import Transaction from '../core/transaction.js';

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
      console.log('✓ Peer connected');
      this.initConnection(socket);
    });

    setTimeout(() => {
      this.connectToPeers();
    }, 1000);

    console.log(`✓ P2P server listening on port ${this.port}`);
  }

  initConnection(socket) {
    this.sockets.push(socket);
    this.initMessageHandler(socket);
    
    setTimeout(() => {
      this.sendChainRequest(socket);
    }, 100);
  }

  initMessageHandler(socket) {
    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(socket, message);
      } catch (error) {
        console.error('Error handling message:', error.message);
      }
    });

    socket.on('close', () => {
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
        data: this.blockchain.chain.map(b => b.toJSON())
      }));
    }
  }

  async handleChainResponse(chainData) {
    if (chainData.length > this.blockchain.chain.length) {
      const newChain = [];
      for (const blockData of chainData) {
        newChain.push(await Block.fromJSON(blockData));
      }
      await this.blockchain.replaceChain(newChain);
    }
  }

  async handleNewBlock(blockData) {
    const block = await Block.fromJSON(blockData);
    const lastBlock = this.blockchain.getLastBlock();

    if (block.index === lastBlock.index + 1 && 
        block.previousHash === lastBlock.hash) {
      
      this.blockchain.chain.push(block);
      this.blockchain.applyBlock(block);
      await this.blockchain.saveChain();
      
      console.log(`✓ Received block #${block.index} from peer`);
    }
  }

  handleNewTransaction(txData) {
    try {
      const tx = Transaction.fromJSON(txData);
      const exists = this.blockchain.mempool.some(t => t.id === tx.id);
      
      if (!exists) {
        this.blockchain.mempool.push(tx);
      }
    } catch (error) {
      console.error('Error handling transaction:', error.message);
    }
  }

  broadcast(message) {
    this.sockets.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(message));
      }
    });
  }

  broadcastBlock(block) {
    this.broadcast({
      type: MessageType.NEW_BLOCK,
      data: block.toJSON()
    });
  }

  broadcastTransaction(tx) {
    this.broadcast({
      type: MessageType.NEW_TRANSACTION,
      data: tx.toJSON()
    });
  }

  connectToPeers() {
    this.peers.forEach(peer => {
      const socket = new WebSocket(peer);

      socket.on('open', () => {
        console.log(`✓ Connected to peer: ${peer}`);
        this.initConnection(socket);
      });

      socket.on('error', () => {
        console.log(`✗ Failed to connect: ${peer}`);
      });
    });
  }
}

export default P2PServer;