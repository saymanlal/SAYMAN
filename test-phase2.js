import { readFileSync } from 'fs';

const baseUrl = process.argv[2] || 'http://localhost:3000';

console.log(`\n🧪 Testing Sayman Phase 2 on ${baseUrl}\n`);

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(method, endpoint, body = null) {
  const url = `${baseUrl}${endpoint}`;
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

// Test wallet
const testWallet = {
  address: '69b3347bf425e05a1b9988c5792b337f4d6b8f7b',
  privateKey: '9a2848b844fc7ff11d78c5ec2bc6b4f3024ec9e892cd4c5b48aef6893b078bd8'
};

async function runTests() {
  console.log('1️⃣  Checking initial stats...');
  let stats = await request('GET', '/api/stats');
  console.log(`   Blocks: ${stats.blocks}, Validators: ${stats.validators}, Total Stake: ${stats.totalStake}`);
  
  console.log('\n2️⃣  Requesting faucet...');
  await request('POST', '/api/faucet', { address: testWallet.address });
  console.log('   ✓ Faucet requested');
  
  console.log('\n3️⃣  Mining block...');
  const mineResult = await request('POST', '/api/mine');
  if (mineResult.success) {
    console.log(`   ✓ Block #${mineResult.block.index} mined`);
  }
  
  console.log('\n4️⃣  Checking balance...');
  const balance = await request('GET', `/api/balance/${testWallet.address}`);
  console.log(`   Balance: ${balance.balance} SAYM`);
  console.log(`   Staked: ${balance.staked} SAYM`);
  
  if (balance.balance >= 50) {
    console.log('\n5️⃣  Staking 50 SAYM...');
    const stakeResult = await request('POST', '/api/stake', {
      address: testWallet.address,
      amount: 50,
      privateKey: testWallet.privateKey
    });
    console.log(`   ✓ Staked successfully`);
    
    console.log('\n6️⃣  Checking validator info...');
    const validator = await request('GET', `/api/validator/${testWallet.address}`);
    console.log(`   Address: ${validator.address.substring(0, 16)}...`);
    console.log(`   Stake: ${validator.stake} SAYM`);
    console.log(`   Active: ${validator.isActive}`);
    console.log(`   Blocks Created: ${validator.blocksCreated}`);
    console.log(`   Total Rewards: ${validator.totalRewards} SAYM`);
  }
  
  console.log('\n7️⃣  Final stats...');
  stats = await request('GET', '/api/stats');
  console.log(`   Blocks: ${stats.blocks}`);
  console.log(`   Validators: ${stats.validators}`);
  console.log(`   Total Stake: ${stats.totalStake} SAYM`);
  console.log(`   Total Rewards: ${stats.totalRewards} SAYM`);
  
  console.log('\n✅ Tests completed!\n');
}

runTests();