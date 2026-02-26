let currentWallet = null;
let apiBase = window.location.origin + '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadWallet();
  updateStats();
  setInterval(updateStats, 5000);
});

// Navigation
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById(pageId).classList.add('active');

  if (pageId === 'validators') {
    loadValidators();
  } else if (pageId === 'explorer') {
    loadBlocks();
  } else if (pageId === 'contracts') {
    loadContracts();
  }
}

// Update stats
async function updateStats() {
  try {
    const res = await fetch(`${apiBase}/stats`);
    const stats = await res.json();

    document.getElementById('stat-blocks').textContent = stats.blocks;
    document.getElementById('stat-validators').textContent = stats.validators;
    document.getElementById('stat-stake').textContent = stats.totalStake + ' SAYM';
    document.getElementById('stat-mempool').textContent = stats.mempool;

    if (currentWallet) {
      const balanceRes = await fetch(`${apiBase}/balance/${currentWallet.address}`);
      const balanceData = await balanceRes.json();
      document.getElementById('wallet-balance').textContent = balanceData.balance + ' SAYM';
      document.getElementById('wallet-staked').textContent = balanceData.stake + ' SAYM';
    }

    loadRecentBlocks();
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Wallet functions - CLIENT-SIDE GENERATION
async function createWallet() {
  try {
    showLoading('Creating wallet...');
    
    // Generate wallet CLIENT-SIDE (never touches server)
    const wallet = new SaymanWallet();
    await wallet.initialize();
    
    currentWallet = wallet.export();
    saveWallet(currentWallet);
    displayWallet();
    
    hideLoading();
    showResult('wallet', '✅ Wallet created CLIENT-SIDE! Your private key never left your browser. Save it securely!', 'success');
  } catch (error) {
    hideLoading();
    showResult('wallet', 'Error creating wallet: ' + error.message, 'error');
  }
}

async function importWallet() {
  const privateKey = prompt('Enter your private key:');
  if (privateKey) {
    try {
      showLoading('Importing wallet...');
      
      // Import wallet CLIENT-SIDE
      const wallet = new SaymanWallet(privateKey);
      await wallet.initialize();
      
      currentWallet = wallet.export();
      saveWallet(currentWallet);
      displayWallet();
      
      hideLoading();
      showResult('wallet', '✅ Wallet imported successfully!', 'success');
    } catch (error) {
      hideLoading();
      showResult('wallet', 'Invalid private key', 'error');
    }
  }
}

function displayWallet() {
  if (currentWallet) {
    document.getElementById('wallet-info').classList.remove('hidden');
    document.getElementById('wallet-address').value = currentWallet.address;
    document.getElementById('wallet-key').value = currentWallet.privateKey;
  }
}

function toggleKey() {
  const keyInput = document.getElementById('wallet-key');
  keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
}

function copyAddress() {
  const addr = document.getElementById('wallet-address');
  addr.select();
  document.execCommand('copy');
  showResult('wallet', 'Address copied!', 'success');
}

function copyKey() {
  const key = document.getElementById('wallet-key');
  const originalType = key.type;
  key.type = 'text';
  key.select();
  document.execCommand('copy');
  key.type = originalType;
  showResult('wallet', 'Private key copied!', 'success');
}

function saveWallet(wallet) {
  localStorage.setItem('sayman_wallet', JSON.stringify(wallet));
}

function loadWallet() {
  const saved = localStorage.getItem('sayman_wallet');
  if (saved) {
    currentWallet = JSON.parse(saved);
    displayWallet();
  }
}

// Send transaction - CLIENT-SIDE SIGNING
async function sendTransaction() {
  const to = document.getElementById('send-to').value;
  const amount = parseFloat(document.getElementById('send-amount').value);
  const privateKey = document.getElementById('send-key').value;

  if (!to || !amount || !privateKey) {
    showResult('send', 'Please fill all fields', 'error');
    return;
  }

  try {
    showLoading('Signing transaction...');
    
    // Create wallet from private key CLIENT-SIDE
    const wallet = new SaymanWallet(privateKey);
    await wallet.initialize();
    
    // Create transaction object
    const txData = {
      type: 'TRANSFER',
      data: { from: wallet.address, to, amount },
      timestamp: Date.now()
    };
    
    // Sign CLIENT-SIDE (private key never sent!)
    const signature = await wallet.signTransaction(txData);
    
    // Send ONLY signed transaction
    const signedTx = {
      ...txData,
      signature,
      publicKey: wallet.publicKey
    };
    
    hideLoading();
    showLoading('Broadcasting...');
    
    const res = await fetch(`${apiBase}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });

    const data = await res.json();
    hideLoading();

    if (data.success) {
      showResult('send', '✅ Transaction signed CLIENT-SIDE and broadcast!', 'success');
      document.getElementById('send-to').value = '';
      document.getElementById('send-amount').value = '';
      document.getElementById('send-key').value = '';
    } else {
      showResult('send', data.error || 'Transaction failed', 'error');
    }
  } catch (error) {
    hideLoading();
    showResult('send', error.message, 'error');
  }
}

// Stake - CLIENT-SIDE SIGNING
async function stakeTokens() {
  const amount = parseFloat(document.getElementById('stake-amount').value);
  const privateKey = document.getElementById('stake-key').value;

  if (!amount || !privateKey) {
    showResult('stake', 'Please fill all fields', 'error');
    return;
  }

  try {
    showLoading('Signing stake transaction...');
    
    const wallet = new SaymanWallet(privateKey);
    await wallet.initialize();
    
    const txData = {
      type: 'STAKE',
      data: { from: wallet.address, amount },
      timestamp: Date.now()
    };
    
    const signature = await wallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature,
      publicKey: wallet.publicKey
    };
    
    hideLoading();
    showLoading('Broadcasting...');
    
    const res = await fetch(`${apiBase}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });

    const data = await res.json();
    hideLoading();

    if (data.success) {
      showResult('stake', '✅ Stake signed CLIENT-SIDE and broadcast!', 'success');
      document.getElementById('stake-amount').value = '';
      document.getElementById('stake-key').value = '';
    } else {
      showResult('stake', data.error || 'Staking failed', 'error');
    }
  } catch (error) {
    hideLoading();
    showResult('stake', error.message, 'error');
  }
}

async function unstakeTokens() {
  const privateKey = document.getElementById('unstake-key').value;

  if (!privateKey) {
    showResult('stake', 'Please enter private key', 'error');
    return;
  }

  try {
    showLoading('Signing unstake transaction...');
    
    const wallet = new SaymanWallet(privateKey);
    await wallet.initialize();
    
    const txData = {
      type: 'UNSTAKE',
      data: { from: wallet.address },
      timestamp: Date.now()
    };
    
    const signature = await wallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature,
      publicKey: wallet.publicKey
    };
    
    hideLoading();
    showLoading('Broadcasting...');
    
    const res = await fetch(`${apiBase}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });

    const data = await res.json();
    hideLoading();

    if (data.success) {
      showResult('stake', `✅ Unstake initiated! Funds available at block ${data.unlockBlock}`, 'success');
      document.getElementById('unstake-key').value = '';
    } else {
      showResult('stake', data.error || 'Unstaking failed', 'error');
    }
  } catch (error) {
    hideLoading();
    showResult('stake', error.message, 'error');
  }
}

// Deploy contract - CLIENT-SIDE SIGNING
async function deployContract() {
  const code = document.getElementById('contract-code').value;
  const privateKey = document.getElementById('deploy-key').value;

  if (!code || !privateKey) {
    showResult('contract', 'Please fill all fields', 'error');
    return;
  }

  try {
    showLoading('Signing contract deployment...');
    
    const wallet = new SaymanWallet(privateKey);
    await wallet.initialize();
    
    const txData = {
      type: 'CONTRACT_DEPLOY',
      data: { from: wallet.address, code },
      timestamp: Date.now()
    };
    
    const signature = await wallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature,
      publicKey: wallet.publicKey
    };
    
    hideLoading();
    showLoading('Broadcasting...');
    
    const res = await fetch(`${apiBase}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });

    const data = await res.json();
    hideLoading();

    if (data.success) {
      showResult('contract', '✅ Contract deployment signed and broadcast!', 'success');
      document.getElementById('contract-code').value = '';
      document.getElementById('deploy-key').value = '';
      setTimeout(loadContracts, 6000);
    } else {
      showResult('contract', data.error || 'Deploy failed', 'error');
    }
  } catch (error) {
    hideLoading();
    showResult('contract', error.message, 'error');
  }
}

// Call contract - CLIENT-SIDE SIGNING
async function callContract() {
  const contractAddress = document.getElementById('call-address').value;
  const method = document.getElementById('call-method').value;
  const argsText = document.getElementById('call-args').value;
  const privateKey = document.getElementById('call-key').value;

  if (!contractAddress || !method || !privateKey) {
    showResult('contract', 'Please fill all fields', 'error');
    return;
  }

  try {
    showLoading('Signing contract call...');
    
    const wallet = new SaymanWallet(privateKey);
    await wallet.initialize();
    
    const args = argsText ? JSON.parse(argsText) : {};
    
    const txData = {
      type: 'CONTRACT_CALL',
      data: { from: wallet.address, contractAddress, method, args },
      timestamp: Date.now()
    };
    
    const signature = await wallet.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature,
      publicKey: wallet.publicKey
    };
    
    hideLoading();
    showLoading('Broadcasting...');
    
    const res = await fetch(`${apiBase}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signedTx)
    });

    const data = await res.json();
    hideLoading();

    if (data.success) {
      showResult('contract', '✅ Contract call signed and broadcast!', 'success');
      document.getElementById('call-address').value = '';
      document.getElementById('call-method').value = '';
      document.getElementById('call-args').value = '';
      document.getElementById('call-key').value = '';
      setTimeout(() => loadContracts(), 6000);
    } else {
      showResult('contract', data.error || 'Call failed', 'error');
    }
  } catch (error) {
    hideLoading();
    showResult('contract', error.message, 'error');
  }
}

// Validators
async function loadValidators() {
  try {
    const res = await fetch(`${apiBase}/validators`);
    const data = await res.json();

    const list = document.getElementById('validators-list');
    list.innerHTML = '';

    if (data.validators.length === 0) {
      list.innerHTML = '<p>No validators yet</p>';
      return;
    }

    data.validators.forEach(v => {
      const div = document.createElement('div');
      div.className = 'validator-item';
      div.innerHTML = `
        <div>
          <span class="address">${v.address.substring(0, 20)}...</span>
          <span class="stake">${v.stake} SAYM</span>
        </div>
        <span>Missed: ${v.missedBlocks}</span>
      `;
      list.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading validators:', error);
  }
}

// Blocks
async function loadRecentBlocks() {
  try {
    const res = await fetch(`${apiBase}/blocks`);
    const data = await res.json();

    const list = document.getElementById('recent-blocks');
    list.innerHTML = '';

    const recentBlocks = data.blocks.slice(-5).reverse();

    recentBlocks.forEach(block => {
      const div = document.createElement('div');
      div.className = 'block-item';
      div.innerHTML = `
        <h4>Block #${block.index}</h4>
        <p>Hash: ${block.hash.substring(0, 32)}...</p>
        <p>Validator: ${block.validator.substring(0, 16)}...</p>
        <p>Transactions: ${block.transactions.length}</p>
      `;
      list.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading blocks:', error);
  }
}

async function loadBlocks() {
  try {
    const res = await fetch(`${apiBase}/blocks`);
    const data = await res.json();

    const list = document.getElementById('blocks-list');
    list.innerHTML = '';

    data.blocks.reverse().forEach(block => {
      const div = document.createElement('div');
      div.className = 'block-item';
      div.innerHTML = `
        <h4>Block #${block.index}</h4>
        <p>Hash: ${block.hash}</p>
        <p>Previous: ${block.previousHash}</p>
        <p>Validator: ${block.validator}</p>
        <p>Transactions: ${block.transactions.length}</p>
        <p>Timestamp: ${new Date(block.timestamp).toLocaleString()}</p>
      `;
      list.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading blocks:', error);
  }
}

// Contracts
async function loadContracts() {
  try {
    const res = await fetch(`${apiBase}/contracts`);
    const data = await res.json();

    const list = document.getElementById('contracts-list');
    list.innerHTML = '';

    if (data.contracts.length === 0) {
      list.innerHTML = '<p>No contracts deployed yet</p>';
      return;
    }

    data.contracts.forEach(contract => {
      const div = document.createElement('div');
      div.className = 'contract-item';
      div.innerHTML = `
        <p><strong>Address:</strong> ${contract.address}</p>
        <p><strong>Creator:</strong> ${contract.creator.substring(0, 16)}...</p>
        <p><strong>State:</strong> ${JSON.stringify(contract.state)}</p>
      `;
      div.onclick = () => {
        document.getElementById('call-address').value = contract.address;
        showPage('contracts');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      list.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading contracts:', error);
  }
}

// Utility functions
function showResult(page, message, type) {
  const resultDiv = document.getElementById(`${page}-result`);
  if (resultDiv) {
    resultDiv.textContent = message;
    resultDiv.className = `result ${type}`;
    setTimeout(() => {
      resultDiv.textContent = '';
      resultDiv.className = 'result';
    }, 5000);
  }
}

function showLoading(message) {
  // Simple loading indicator
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    color: white;
    font-size: 1.5rem;
  `;
  overlay.textContent = message;
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}