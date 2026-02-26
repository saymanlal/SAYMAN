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

  // Update page-specific data
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

    // Update wallet balance if logged in
    if (currentWallet) {
      const balanceRes = await fetch(`${apiBase}/balance/${currentWallet.address}`);
      const balanceData = await balanceRes.json();
      document.getElementById('wallet-balance').textContent = balanceData.balance + ' SAYM';
      document.getElementById('wallet-staked').textContent = balanceData.stake + ' SAYM';
    }

    // Update recent blocks on dashboard
    loadRecentBlocks();
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Wallet functions
function createWallet() {
  const wallet = generateWallet();
  currentWallet = wallet;
  saveWallet(wallet);
  displayWallet();
  showResult('wallet', 'Wallet created successfully! Save your private key securely.', 'success');
}

function importWallet() {
  const privateKey = prompt('Enter your private key:');
  if (privateKey) {
    try {
      const wallet = { privateKey, address: deriveAddress(privateKey) };
      currentWallet = wallet;
      saveWallet(wallet);
      displayWallet();
      showResult('wallet', 'Wallet imported successfully!', 'success');
    } catch (error) {
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

function generateWallet() {
  // Simple wallet generation (in production, use proper crypto)
  const privateKey = Array.from({length: 64}, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  
  return {
    privateKey,
    address: deriveAddress(privateKey)
  };
}

function deriveAddress(privateKey) {
  // Simple address derivation (in production, use proper crypto)
  let hash = 0;
  for (let i = 0; i < privateKey.length; i++) {
    hash = ((hash << 5) - hash) + privateKey.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(40, '0').substring(0, 40);
}

// Send transaction
async function sendTransaction() {
  const to = document.getElementById('send-to').value;
  const amount = parseFloat(document.getElementById('send-amount').value);
  const privateKey = document.getElementById('send-key').value;

  if (!to || !amount || !privateKey) {
    showResult('send', 'Please fill all fields', 'error');
    return;
  }

  try {
    const from = deriveAddress(privateKey);
    
    const res = await fetch(`${apiBase}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, amount, privateKey })
    });

    const data = await res.json();

    if (data.success) {
      showResult('send', 'Transaction sent successfully!', 'success');
      document.getElementById('send-to').value = '';
      document.getElementById('send-amount').value = '';
      document.getElementById('send-key').value = '';
    } else {
      showResult('send', data.error || 'Transaction failed', 'error');
    }
  } catch (error) {
    showResult('send', error.message, 'error');
  }
}

// Stake
async function stakeTokens() {
  const amount = parseFloat(document.getElementById('stake-amount').value);
  const privateKey = document.getElementById('stake-key').value;

  if (!amount || !privateKey) {
    showResult('stake', 'Please fill all fields', 'error');
    return;
  }

  try {
    const from = deriveAddress(privateKey);
    
    const res = await fetch(`${apiBase}/stake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, amount, privateKey })
    });

    const data = await res.json();

    if (data.success) {
      showResult('stake', 'Staked successfully!', 'success');
      document.getElementById('stake-amount').value = '';
      document.getElementById('stake-key').value = '';
    } else {
      showResult('stake', data.error || 'Staking failed', 'error');
    }
  } catch (error) {
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
    const from = deriveAddress(privateKey);
    
    const res = await fetch(`${apiBase}/unstake`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, privateKey })
    });

    const data = await res.json();

    if (data.success) {
      showResult('stake', `Unstaked! Funds available at block ${data.unlockBlock}`, 'success');
      document.getElementById('unstake-key').value = '';
    } else {
      showResult('stake', data.error || 'Unstaking failed', 'error');
    }
  } catch (error) {
    showResult('stake', error.message, 'error');
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
        <span class="address">${v.address.substring(0, 16)}...</span>
        <span class="stake">${v.stake} SAYM</span>
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
async function deployContract() {
  const code = document.getElementById('contract-code').value;
  const privateKey = document.getElementById('deploy-key').value;

  if (!code || !privateKey) {
    showResult('contract', 'Please fill all fields', 'error');
    return;
  }

  try {
    const from = deriveAddress(privateKey);
    
    const res = await fetch(`${apiBase}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, code, privateKey })
    });

    const data = await res.json();

    if (data.success) {
      showResult('contract', 'Contract deployed successfully!', 'success');
      document.getElementById('contract-code').value = '';
      document.getElementById('deploy-key').value = '';
      setTimeout(loadContracts, 6000); // Reload after next block
    } else {
      showResult('contract', data.error || 'Deploy failed', 'error');
    }
  } catch (error) {
    showResult('contract', error.message, 'error');
  }
}

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
    const from = deriveAddress(privateKey);
    const args = argsText ? JSON.parse(argsText) : {};
    
    const res = await fetch(`${apiBase}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, contractAddress, method, args, privateKey })
    });

    const data = await res.json();

    if (data.success) {
      showResult('contract', 'Contract called successfully!', 'success');
      document.getElementById('call-address').value = '';
      document.getElementById('call-method').value = '';
      document.getElementById('call-args').value = '';
      document.getElementById('call-key').value = '';
    } else {
      showResult('contract', data.error || 'Call failed', 'error');
    }
  } catch (error) {
    showResult('contract', error.message, 'error');
  }
}

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
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      list.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading contracts:', error);
  }
}

// Utility
function showResult(page, message, type) {
  const resultDiv = document.getElementById(`${page}-result`);
  resultDiv.textContent = message;
  resultDiv.className = `result ${type}`;
  setTimeout(() => {
    resultDiv.textContent = '';
    resultDiv.className = 'result';
  }, 5000);
}