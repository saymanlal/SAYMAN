const apiBase = window.location.origin + '/api';
let currentWallet = null;

// Initialize
async function init() {
  console.log('🚀 Initializing app...');
  console.log('API Base:', apiBase);
  
  await loadHeader();
  await loadDashboard();
  
  // Auto-refresh every 5 seconds
  setInterval(async () => {
    const activePage = document.querySelector('.page.active');
    if (activePage && activePage.id === 'dashboard') {
      await loadDashboard();
    } else if (activePage && activePage.id === 'explorer') {
      await loadExplorer();
    } else if (activePage && activePage.id === 'network') {
      await loadNetwork();
    }
  }, 5000);
}

// Page Navigation
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  
  document.getElementById(pageId).classList.add('active');
  event.target.classList.add('active');
  
  if (pageId === 'dashboard') {
    loadDashboard();
  } else if (pageId === 'explorer') {
    loadExplorer();
  } else if (pageId === 'validators') {
    loadValidators();
  } else if (pageId === 'contracts') {
    loadContracts();
  } else if (pageId === 'network') {
    loadNetwork();
  }
}

// Load Header
async function loadHeader() {
  try {
    console.log('📡 Loading header...');
    
    const [networkRes, statsRes] = await Promise.all([
      fetch(`${apiBase}/network`).catch(e => { console.error('Network fetch error:', e); return null; }),
      fetch(`${apiBase}/network/stats`).catch(e => { console.error('Stats fetch error:', e); return null; })
    ]);
    
    if (!networkRes || !statsRes) {
      throw new Error('Failed to fetch data');
    }
    
    const network = await networkRes.json();
    const stats = await statsRes.json();
    
    console.log('✅ Header data loaded:', { network, stats });
    
    document.getElementById('header-network').textContent = network.network || 'Unknown';
    document.getElementById('header-chain').textContent = network.chainId || 'Unknown';
    document.getElementById('header-node').textContent = stats.nodeId ? stats.nodeId.substring(0, 16) + '...' : 'Unknown';
    document.getElementById('header-mode').textContent = stats.mode ? stats.mode.toUpperCase() : 'Unknown';
  } catch (error) {
    console.error('❌ Error loading header:', error);
    document.getElementById('header-network').textContent = 'Connection Error';
    document.getElementById('header-chain').textContent = 'Check Console (F12)';
    document.getElementById('header-node').textContent = 'Press F12';
    document.getElementById('header-mode').textContent = 'Error';
  }
}

// Load Dashboard
async function loadDashboard() {
  try {
    console.log('📊 Loading dashboard...');
    
    const [statsRes, blocksRes, networkRes] = await Promise.all([
      fetch(`${apiBase}/stats`).catch(e => { console.error('Stats error:', e); return null; }),
      fetch(`${apiBase}/blocks?limit=10`).catch(e => { console.error('Blocks error:', e); return null; }),
      fetch(`${apiBase}/network`).catch(e => { console.error('Network error:', e); return null; })
    ]);
    
    if (!statsRes || !blocksRes || !networkRes) {
      throw new Error('Failed to fetch dashboard data');
    }
    
    const stats = await statsRes.json();
    const blocksData = await blocksRes.json();
    const network = await networkRes.json();
    
    console.log('✅ Dashboard data:', { stats, blocksData, network });
    
    // Update stats
    document.getElementById('stat-blocks').textContent = stats.blocks || 0;
    document.getElementById('stat-validators').textContent = stats.validators || 0;
    document.getElementById('stat-stake').innerHTML = `${stats.totalStake || 0}<span class="stat-unit">SAYM</span>`;
    document.getElementById('stat-mempool').textContent = stats.mempool || 0;
    document.getElementById('stat-contracts').textContent = stats.contracts || 0;
    
    const blockReward = network.blockReward || 10;
    const blockTime = network.blockTime || 5000;
    
    document.getElementById('stat-reward').innerHTML = `${blockReward}<span class="stat-unit">SAYM</span>`;
    document.getElementById('stat-blocktime').innerHTML = `${blockTime / 1000}<span class="stat-unit">s</span>`;
    
    // Calculate APR
    const apr = stats.totalStake > 0 
      ? ((blockReward * 365 * 24 * 60 * 12) / stats.totalStake * 100).toFixed(2)
      : 0;
    document.getElementById('stat-apr').innerHTML = `${apr}<span class="stat-unit">%</span>`;
    
    // Update block feed
    const feed = document.getElementById('block-feed');
    feed.innerHTML = '';
    
    if (blocksData.blocks && blocksData.blocks.length > 0) {
      blocksData.blocks.forEach(block => {
        const item = document.createElement('div');
        item.className = 'block-item';
        
        const time = new Date(block.timestamp);
        const timeStr = time.toLocaleTimeString();
        
        item.innerHTML = `
          <div class="block-index">#${block.index}</div>
          <div class="block-hash mono">${block.hash}</div>
          <div class="block-time">${timeStr}</div>
        `;
        
        feed.appendChild(item);
      });
    } else {
      feed.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--mono-400);">Waiting for blocks...</div>';
    }
    
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    document.getElementById('stat-blocks').textContent = 'Error - Check Console';
  }
}

// Load Explorer
async function loadExplorer() {
  try {
    const res = await fetch(`${apiBase}/blocks?limit=20`);
    const data = await res.json();
    
    const tbody = document.getElementById('explorer-blocks');
    tbody.innerHTML = '';
    
    if (data.blocks && data.blocks.length > 0) {
      data.blocks.forEach(block => {
        const tr = document.createElement('tr');
        const time = new Date(block.timestamp).toLocaleString();
        
        tr.innerHTML = `
          <td><strong>#${block.index}</strong></td>
          <td class="mono">${block.hash.substring(0, 16)}...</td>
          <td class="mono">${block.validator ? block.validator.substring(0, 8) + '...' : 'Genesis'}</td>
          <td>${block.transactions ? block.transactions.length : 0}</td>
          <td>${block.gasUsed || 0}</td>
          <td>${time}</td>
        `;
        
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--mono-400);">No blocks found</td></tr>';
    }
  } catch (error) {
    console.error('Error loading explorer:', error);
  }
}

// Load Validators
async function loadValidators() {
  try {
    const res = await fetch(`${apiBase}/validators`);
    const data = await res.json();
    
    console.log('Validators data:', data);
    
    const tbody = document.getElementById('validator-list');
    tbody.innerHTML = '';
    
    if (data.validators && data.validators.length > 0) {
      data.validators.forEach(validator => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="mono">${validator.address.substring(0, 16)}...</td>
          <td><strong>${validator.stake} SAYM</strong></td>
          <td>${validator.percentage}%</td>
          <td>${validator.missedBlocks || 0}</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--mono-400);">No validators found</td></tr>';
    }
  } catch (error) {
    console.error('Error loading validators:', error);
  }
}

// Load Contracts
async function loadContracts() {
  try {
    const res = await fetch(`${apiBase}/contracts`);
    const data = await res.json();
    
    const tbody = document.getElementById('contract-list');
    tbody.innerHTML = '';
    
    if (data.contracts && data.contracts.length > 0) {
      data.contracts.forEach(contract => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td class="mono">${contract.address.substring(0, 16)}...</td>
          <td class="mono">${contract.owner.substring(0, 16)}...</td>
          <td>${contract.codeSize} bytes</td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--mono-400);">No contracts deployed</td></tr>';
    }
  } catch (error) {
    console.error('Error loading contracts:', error);
  }
}

// Load Network
async function loadNetwork() {
  try {
    const res = await fetch(`${apiBase}/network/stats`);
    const data = await res.json();
    
    document.getElementById('net-peers').textContent = data.peers || 0;
    document.getElementById('net-height').textContent = data.blockHeight || 0;
    document.getElementById('net-blocktime').innerHTML = `${data.averageBlockTime || 0}<span class="stat-unit">ms</span>`;
    document.getElementById('net-mempool').textContent = data.mempool || 0;
    
    document.getElementById('net-node-id').textContent = data.nodeId ? data.nodeId.substring(0, 32) + '...' : 'Unknown';
    document.getElementById('net-mode').textContent = data.mode ? data.mode.toUpperCase() : 'Unknown';
    document.getElementById('net-network').textContent = data.network || 'Unknown';
    document.getElementById('net-chain').textContent = data.chainId || 'Unknown';
    
    const uptime = Math.floor(data.uptime || 0);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    document.getElementById('net-uptime').textContent = `${hours}h ${minutes}m ${seconds}s`;
    
    const peerList = document.getElementById('peer-list');
    
    if (data.peerList && data.peerList.length > 0) {
      let html = '<table><thead><tr><th>Node ID</th><th>IP</th><th>Chain ID</th><th>Version</th></tr></thead><tbody>';
      
      data.peerList.forEach(peer => {
        html += `
          <tr>
            <td class="mono">${peer.nodeId.substring(0, 16)}...</td>
            <td>${peer.ip}:${peer.port}</td>
            <td class="mono">${peer.chainId}</td>
            <td>${peer.version}</td>
          </tr>
        `;
      });
      
      html += '</tbody></table>';
      peerList.innerHTML = html;
    } else {
      peerList.innerHTML = '<div style="padding: 24px; border: var(--border); text-align: center; color: var(--mono-400);">No peers connected</div>';
    }
  } catch (error) {
    console.error('Error loading network:', error);
  }
}

// Wallet Functions
async function createWallet() {
  try {
    const wallet = new SaymanWallet();
    await wallet.initialize();
    currentWallet = wallet;
    
    const result = document.getElementById('wallet-result');
    result.innerHTML = `
      <div class="alert alert-success" style="margin-top: 16px;">
        <div style="margin-bottom: 8px;"><strong>Wallet Created</strong></div>
        <div class="input-group">
          <label class="input-label">Address</label>
          <input type="text" value="${wallet.address}" readonly class="mono">
        </div>
        <div class="input-group">
          <label class="input-label">Private Key</label>
          <textarea readonly class="mono" style="font-size: 11px;">${wallet.privateKey}</textarea>
        </div>
        <div style="font-size: 11px; color: var(--mono-400); margin-top: 8px;">
          CRITICAL: Save your private key securely. Never share it with anyone.
        </div>
      </div>
    `;
  } catch (error) {
    showError('wallet-result', error.message);
  }
}

async function checkBalance() {
  try {
    const address = document.getElementById('balance-address').value.trim();
    
    if (!address) {
      showError('balance-result', 'Please enter an address');
      return;
    }
    
    const res = await fetch(`${apiBase}/address/${address}`);
    const data = await res.json();
    
    const result = document.getElementById('balance-result');
    result.innerHTML = `
      <div class="alert alert-success" style="margin-top: 16px;">
        <table style="width: 100%; margin: 0;">
          <tr>
            <td><strong>Balance</strong></td>
            <td style="text-align: right;"><strong>${data.balance} SAYM</strong></td>
          </tr>
          <tr>
            <td><strong>Staked</strong></td>
            <td style="text-align: right;">${data.stake} SAYM</td>
          </tr>
          <tr>
            <td><strong>Nonce</strong></td>
            <td style="text-align: right;">${data.nonce}</td>
          </tr>
        </table>
      </div>
    `;
  } catch (error) {
    showError('balance-result', error.message);
  }
}

async function sendTransaction() {
  try {
    const to = document.getElementById('send-to').value.trim();
    const amount = parseFloat(document.getElementById('send-amount').value);
    const privateKey = document.getElementById('send-key').value.trim();
    
    if (!to || !amount || !privateKey) {
      showError('send-result', 'Please fill all fields');
      return;
    }
    
    const wallet = new SaymanWallet(privateKey);
    await wallet.initialize();
    
    const addressRes = await fetch(`${apiBase}/address/${wallet.address}`);
    const addressData = await addressRes.json();
    const nonce = addressData.nonce || 0;
    
    const gasEstimate = await fetch(`${apiBase}/estimate-gas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'TRANSFER',
        data: { from: wallet.address, to, amount }
      })
    });
    const gas = await gasEstimate.json();
    
    const txData = {
      type: 'TRANSFER',
      data: { from: wallet.address, to, amount },
      timestamp: Date.now(),
      gasLimit: gas.recommendedGasLimit,
      gasPrice: gas.minGasPrice,
      nonce: nonce
    };
    
    const signature = await wallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: wallet.publicKey
    };
    
    const res = await fetch(`${apiBase}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });
    
    const result = await res.json();
    
    if (result.success) {
      document.getElementById('send-result').innerHTML = `
        <div class="alert alert-success" style="margin-top: 16px;">
          <strong>Transaction Broadcast</strong><br>
          TX ID: <span class="mono">${result.txId.substring(0, 16)}...</span><br>
          Gas: ${result.maxGasCost} wei
        </div>
      `;
      
      document.getElementById('send-to').value = '';
      document.getElementById('send-amount').value = '';
      document.getElementById('send-key').value = '';
    } else {
      showError('send-result', result.error);
    }
  } catch (error) {
    showError('send-result', error.message);
  }
}

async function stakeTokens() {
  try {
    const amount = parseFloat(document.getElementById('stake-amount').value);
    const privateKey = document.getElementById('stake-key').value.trim();
    
    if (!amount || !privateKey) {
      showError('stake-result', 'Please fill all fields');
      return;
    }
    
    const wallet = new SaymanWallet(privateKey);
    await wallet.initialize();
    
    const addressRes = await fetch(`${apiBase}/address/${wallet.address}`);
    const addressData = await addressRes.json();
    const nonce = addressData.nonce || 0;
    
    const gasEstimate = await fetch(`${apiBase}/estimate-gas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'STAKE',
        data: { from: wallet.address, amount }
      })
    });
    const gas = await gasEstimate.json();
    
    const txData = {
      type: 'STAKE',
      data: { from: wallet.address, amount },
      timestamp: Date.now(),
      gasLimit: gas.recommendedGasLimit,
      gasPrice: gas.minGasPrice,
      nonce: nonce
    };
    
    const signature = await wallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: wallet.publicKey
    };
    
    const res = await fetch(`${apiBase}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });
    
    const result = await res.json();
    
    if (result.success) {
      document.getElementById('stake-result').innerHTML = `
        <div class="alert alert-success" style="margin-top: 16px;">
          <strong>Stake Transaction Broadcast</strong><br>
          TX ID: <span class="mono">${result.txId.substring(0, 16)}...</span>
        </div>
      `;
      
      document.getElementById('stake-amount').value = '';
      document.getElementById('stake-key').value = '';
    } else {
      showError('stake-result', result.error);
    }
  } catch (error) {
    showError('stake-result', error.message);
  }
}

function showError(elementId, message) {
  document.getElementById(elementId).innerHTML = `
    <div class="alert alert-error" style="margin-top: 16px;">
      <strong>Error:</strong> ${message}
    </div>
  `;
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);