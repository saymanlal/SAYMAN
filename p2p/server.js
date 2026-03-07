import { WebSocketServer, WebSocket } from 'ws';
import PeerManager from './peerManager.js';

class P2PServer {
  constructor(blockchain, port, bootstrapPeers = [], mode = 'fullnode') {
    this.blockchain = blockchain;
    this.port = port;
    this.bootstrapPeers = bootstrapPeers;
    this.mode = mode;
    this.server = null;
    
    // Generate unique node ID
    this.nodeId = PeerManager.generateNodeId();
    
    // Peer manager
    this.peerManager = new PeerManager(
      this.nodeId,
      blockchain.chainId,
      '7.0.0'
    );

    console.log(`📡 Node ID: ${this.nodeId}`);
    console.log(`🔗 Mode: ${mode.toUpperCase()}`);
  }

  listen() {
    this.server = new WebSocketServer({ port: this.port });

    this.server.on('connection', (socket, req) => {
      const ip = req.socket.remoteAddress;
      console.log(`📥 Incoming connection from ${ip}`);

      socket.on('message', (data) => {
        this.handleMessage(socket, data.toString(), ip);
      });

      socket.on('close', () => {
        // Find and remove peer
        for (const [nodeId, peer] of this.peerManager.peers.entries()) {
          if (peer.socket === socket) {
            this.peerManager.removePeer(nodeId);
            break;
          }
        }
      });

      socket.on('error', (error) => {
        console.error('WebSocket error:', error.message);
      });
    });

    console.log(`✅ P2P server listening on ws://0.0.0.0:${this.port}`);

    // Start peer manager
    this.peerManager.start();

    // Connect to bootstrap peers
    if (this.bootstrapPeers.length > 0) {
      setTimeout(() => {
        this.connectToBootstrapPeers();
      }, 1000);
    }
  }

  async connectToBootstrapPeers() {
    console.log(`\n🔍 Connecting to bootstrap peers...`);
    
    for (const peer of this.bootstrapPeers) {
      await this.connectToPeer(peer);
    }
  }

  async connectToPeer(peerAddress) {
    return new Promise((resolve) => {
      try {
        const socket = new WebSocket(`ws://${peerAddress}`);

        socket.on('open', () => {
          console.log(`✓ Connected to ${peerAddress}`);
          
          // Send HELLO message
          this.sendHello(socket);
          
          // Request peer list
          setTimeout(() => {
            this.requestPeerList(socket);
          }, 1000);

          // Request chain sync if needed
          setTimeout(() => {
            this.requestChainSync(socket);
          }, 2000);

          resolve(true);
        });

        socket.on('message', (data) => {
          this.handleMessage(socket, data.toString(), peerAddress.split(':')[0]);
        });

        socket.on('close', () => {
          // Find and remove peer
          for (const [nodeId, peer] of this.peerManager.peers.entries()) {
            if (peer.socket === socket) {
              this.peerManager.removePeer(nodeId);
              break;
            }
          }
        });

        socket.on('error', (error) => {
          console.error(`Error connecting to ${peerAddress}:`, error.message);
          resolve(false);
        });

      } catch (error) {
        console.error(`Failed to connect to ${peerAddress}:`, error.message);
        resolve(false);
      }
    });
  }

  handleMessage(socket, data, ip) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'HELLO':
          this.handleHello(socket, message, ip);
          break;

        case 'PEERS_REQUEST':
          this.handlePeersRequest(socket, message);
          break;

        case 'PEERS_RESPONSE':
          this.handlePeersResponse(message);
          break;

        case 'NEW_TX':
          this.handleNewTransaction(message);
          break;

        case 'NEW_BLOCK':
          this.handleNewBlock(message);
          break;

        case 'CHAIN_SYNC_REQUEST':
          this.handleChainSyncRequest(socket, message);
          break;

        case 'CHAIN_SYNC_RESPONSE':
          this.handleChainSyncResponse(message);
          break;

        case 'HEARTBEAT':
          this.handleHeartbeat(message);
          break;

        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error.message);
    }
  }

  sendHello(socket) {
    const message = {
      type: 'HELLO',
      nodeId: this.nodeId,
      chainId: this.blockchain.chainId,
      version: '7.0.0',
      port: this.port,
      mode: this.mode,
      blockHeight: this.blockchain.chain.length
    };

    socket.send(JSON.stringify(message));
  }

  handleHello(socket, message, ip) {
    const { nodeId, chainId, version, port, mode, blockHeight } = message;

    // Add peer
    const added = this.peerManager.addPeer(socket, nodeId, ip, port, chainId, version);

    if (added) {
      // Send HELLO back
      this.sendHello(socket);

      console.log(`📊 Peer info: Mode=${mode}, Height=${blockHeight}`);

      // If peer has more blocks, request sync
      if (blockHeight > this.blockchain.chain.length) {
        console.log(`📥 Peer has more blocks (${blockHeight} vs ${this.blockchain.chain.length}), requesting sync...`);
        setTimeout(() => {
          this.requestChainSync(socket);
        }, 1000);
      }
    }
  }

  requestPeerList(socket) {
    const message = {
      type: 'PEERS_REQUEST',
      nodeId: this.nodeId
    };

    socket.send(JSON.stringify(message));
  }

  handlePeersRequest(socket, message) {
    const peerList = this.peerManager.getPeerList();

    const response = {
      type: 'PEERS_RESPONSE',
      nodeId: this.nodeId,
      peers: peerList
    };

    socket.send(JSON.stringify(response));
  }

  handlePeersResponse(message) {
    const { peers } = message;

    console.log(`📋 Received ${peers.length} peers from network`);

    // Connect to discovered peers
    for (const peer of peers) {
      if (peer.nodeId !== this.nodeId && !this.peerManager.peers.has(peer.nodeId)) {
        if (this.peerManager.peers.size < this.peerManager.maxPeers) {
          const peerAddress = `${peer.ip}:${peer.port}`;
          console.log(`🔗 Connecting to discovered peer: ${peerAddress}`);
          setTimeout(() => {
            this.connectToPeer(peerAddress);
          }, Math.random() * 5000); // Stagger connections
        }
      }
    }
  }

  handleNewTransaction(message) {
    try {
      const { transaction, fromNodeId } = message;

      // Update peer activity
      this.peerManager.updatePeerActivity(fromNodeId);

      // Check if we already have this transaction
      const exists = this.blockchain.mempool.find(tx => tx.id === transaction.id);
      if (exists) {
        return;
      }

      console.log(`📨 Received transaction from network: ${transaction.id.substring(0, 8)}...`);

      // Add to our mempool (with validation)
      const tx = this.blockchain.constructor.reconstructTransaction(transaction);
      // Note: We'd need to validate this properly
      this.blockchain.mempool.push(tx);

      // Relay to other peers (exclude sender)
      this.broadcastTransaction(tx, fromNodeId);

    } catch (error) {
      console.error('Error handling new transaction:', error.message);
    }
  }

  handleNewBlock(message) {
    try {
      const { block, fromNodeId } = message;

      // Update peer activity
      this.peerManager.updatePeerActivity(fromNodeId);

      console.log(`📦 Received block #${block.index} from network`);

      // Validate and add block
      this.addReceivedBlock(block);

      // Relay to other peers (exclude sender)
      this.relayBlock(block, fromNodeId);

    } catch (error) {
      console.error('Error handling new block:', error.message);
    }
  }

  async addReceivedBlock(blockData) {
    try {
      // Check if we already have this block
      if (this.blockchain.chain[blockData.index]) {
        return;
      }

      // If block index is ahead, request chain sync
      if (blockData.index > this.blockchain.chain.length) {
        console.log(`⚠ Block index ahead of our chain, requesting sync...`);
        // Find a peer to sync from
        const peers = this.peerManager.getActivePeers();
        if (peers.length > 0) {
          this.requestChainSync(peers[0].socket);
        }
        return;
      }

      // Reconstruct block
      const Block = (await import('../core/block.js')).default;
      const block = await Block.fromJSON(blockData);

      // Validate block
      const lastBlock = this.blockchain.getLastBlock();
      
      if (block.previousHash !== lastBlock.hash) {
        console.log(`❌ Block previousHash mismatch`);
        return;
      }

      if (block.hash !== block.calculateHash()) {
        console.log(`❌ Block hash invalid`);
        return;
      }

      // Add to chain
      this.blockchain.chain.push(block);
      this.blockchain.applyBlock(block);
      await this.blockchain.saveChain();

      console.log(`✅ Block #${block.index} added to chain`);

    } catch (error) {
      console.error('Error adding received block:', error.message);
    }
  }

  requestChainSync(socket) {
    const message = {
      type: 'CHAIN_SYNC_REQUEST',
      nodeId: this.nodeId,
      currentHeight: this.blockchain.chain.length
    };

    socket.send(JSON.stringify(message));
    console.log(`📥 Requesting chain sync...`);
  }

  handleChainSyncRequest(socket, message) {
    const { currentHeight } = message;

    console.log(`📤 Peer requesting chain sync from height ${currentHeight}`);

    const response = {
      type: 'CHAIN_SYNC_RESPONSE',
      nodeId: this.nodeId,
      latestHeight: this.blockchain.chain.length,
      blocks: this.blockchain.chain.slice(currentHeight).map(b => b.toJSON())
    };

    socket.send(JSON.stringify(response));
  }

  async handleChainSyncResponse(message) {
    const { blocks, latestHeight } = message;

    console.log(`📥 Received chain sync: ${blocks.length} blocks (height: ${latestHeight})`);

    if (blocks.length === 0) {
      return;
    }

    try {
      // Reconstruct blocks
      const Block = (await import('../core/block.js')).default;
      const newBlocks = [];

      for (const blockData of blocks) {
        const block = await Block.fromJSON(blockData);
        newBlocks.push(block);
      }

      // Validate chain
      const combinedChain = [...this.blockchain.chain, ...newBlocks];
      
      if (this.blockchain.isValidChain(combinedChain)) {
        // Replace chain
        await this.blockchain.replaceChain(combinedChain);
        console.log(`✅ Chain synced to height ${this.blockchain.chain.length}`);
      } else {
        console.log(`❌ Received invalid chain`);
      }

    } catch (error) {
      console.error('Error syncing chain:', error.message);
    }
  }

  handleHeartbeat(message) {
    this.peerManager.updatePeerActivity(message.nodeId);
  }

  broadcastTransaction(tx, excludeNodeId = null) {
    const message = {
      type: 'NEW_TX',
      transaction: tx.toJSON(),
      fromNodeId: this.nodeId
    };

    const sent = this.peerManager.broadcast(message, excludeNodeId);
    if (sent > 0) {
      console.log(`📡 Broadcast transaction to ${sent} peers`);
    }
  }

  broadcastBlock(block) {
    const message = {
      type: 'NEW_BLOCK',
      block: block.toJSON(),
      fromNodeId: this.nodeId
    };

    const sent = this.peerManager.broadcast(message);
    console.log(`📡 Broadcast block #${block.index} to ${sent} peers`);
  }

  relayBlock(blockData, excludeNodeId) {
    const message = {
      type: 'NEW_BLOCK',
      block: blockData,
      fromNodeId: this.nodeId
    };

    this.peerManager.broadcast(message, excludeNodeId);
  }

  getNetworkStats() {
    return {
      nodeId: this.nodeId,
      mode: this.mode,
      peers: this.peerManager.getPeerCount(),
      peerList: this.peerManager.getPeerList()
    };
  }

  // Heartbeat to keep connections alive
  startHeartbeat() {
    setInterval(() => {
      const message = {
        type: 'HEARTBEAT',
        nodeId: this.nodeId,
        timestamp: Date.now()
      };

      this.peerManager.broadcast(message);
    }, 30000); // Every 30 seconds
  }

  close() {
    this.peerManager.stop();
    if (this.server) {
      this.server.close();
    }
  }
}

export default P2PServer;