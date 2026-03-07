#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load wallet module
import { SaymanWalletCLI } from './wallet-cli.js';

const program = new Command();

// Configuration
const CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE, '.sayman');
const WALLET_PATH = path.join(CONFIG_PATH, 'wallet.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_PATH)) {
  fs.mkdirSync(CONFIG_PATH, { recursive: true });
}

// API Base URL
let API_BASE = process.env.SAYMAN_API || 'http://localhost:3000/api';

// Helper functions
function loadWallet() {
  if (!fs.existsSync(WALLET_PATH)) {
    console.log(chalk.red('❌ No wallet found. Create one with: sayman wallet create'));
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
}

function saveWallet(wallet) {
  fs.writeFileSync(WALLET_PATH, JSON.stringify(wallet, null, 2));
}

async function apiCall(endpoint, options = {}) {
  const spinner = ora('Processing...').start();
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    const data = await response.json();
    spinner.stop();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  } catch (error) {
    spinner.stop();
    console.log(chalk.red(`❌ Error: ${error.message}`));
    process.exit(1);
  }
}

// Program info
program
  .name('sayman')
  .description('Sayman Blockchain CLI')
  .version('6.0.0');

// Wallet commands
const wallet = program.command('wallet').description('Wallet management');

wallet
  .command('create')
  .description('Create a new wallet')
  .action(async () => {
    const spinner = ora('Creating wallet...').start();
    
    try {
      const walletCLI = new SaymanWalletCLI();
      await walletCLI.initialize();
      
      const exported = walletCLI.export();
      saveWallet(exported);
      
      spinner.succeed(chalk.green('✅ Wallet created successfully!'));
      console.log('\n' + chalk.yellow('⚠️  SAVE YOUR PRIVATE KEY SECURELY!'));
      console.log(chalk.cyan('━'.repeat(60)));
      console.log(chalk.bold('Address:     ') + chalk.white(exported.address));
      console.log(chalk.bold('Private Key: ') + chalk.red(exported.privateKey));
      console.log(chalk.cyan('━'.repeat(60)));
      console.log(chalk.yellow('\n⚠️  Never share your private key with anyone!\n'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to create wallet'));
      console.log(chalk.red(error.message));
    }
  });

wallet
  .command('import <privateKey>')
  .description('Import wallet from private key')
  .action(async (privateKey) => {
    const spinner = ora('Importing wallet...').start();
    
    try {
      const walletCLI = new SaymanWalletCLI(privateKey);
      await walletCLI.initialize();
      
      const exported = walletCLI.export();
      saveWallet(exported);
      
      spinner.succeed(chalk.green('✅ Wallet imported successfully!'));
      console.log(chalk.bold('\nAddress: ') + chalk.white(exported.address));
    } catch (error) {
      spinner.fail(chalk.red('Failed to import wallet'));
      console.log(chalk.red(error.message));
    }
  });

wallet
  .command('info')
  .description('Show wallet information')
  .action(async () => {
    const walletData = loadWallet();
    
    console.log(chalk.cyan('\n━━━ Wallet Information ━━━'));
    console.log(chalk.bold('Address: ') + chalk.white(walletData.address));
    console.log(chalk.cyan('━'.repeat(30)) + '\n');
  });

wallet
  .command('export')
  .description('Export private key')
  .action(() => {
    const walletData = loadWallet();
    
    console.log(chalk.yellow('\n⚠️  WARNING: Never share your private key!\n'));
    console.log(chalk.bold('Private Key: ') + chalk.red(walletData.privateKey));
    console.log();
  });

// Balance command
program
  .command('balance [address]')
  .description('Check balance (uses your wallet if no address provided)')
  .action(async (address) => {
    if (!address) {
      const walletData = loadWallet();
      address = walletData.address;
    }
    
    const data = await apiCall(`/address/${address}`);
    
    console.log(chalk.cyan('\n━━━ Account Balance ━━━'));
    console.log(chalk.bold('Address:  ') + chalk.white(address.substring(0, 16) + '...'));
    console.log(chalk.bold('Balance:  ') + chalk.green(data.balance + ' SAYM'));
    console.log(chalk.bold('Staked:   ') + chalk.yellow(data.stake + ' SAYM'));
    console.log(chalk.bold('Nonce:    ') + chalk.white(data.nonce));
    
    if (data.isValidator) {
      console.log(chalk.bold('Status:   ') + chalk.green('✓ Validator'));
    }
    
    console.log(chalk.cyan('━'.repeat(30)) + '\n');
  });

// Send command
program
  .command('send <to> <amount>')
  .description('Send SAYM tokens')
  .option('-g, --gas-limit <limit>', 'Gas limit', '50000')
  .option('-p, --gas-price <price>', 'Gas price', '1')
  .action(async (to, amount, options) => {
    const walletData = loadWallet();
    const walletCLI = new SaymanWalletCLI(walletData.privateKey);
    await walletCLI.initialize();
    
    // Get nonce
    const addressData = await apiCall(`/address/${walletData.address}`);
    
    console.log(chalk.cyan('\n━━━ Transaction Details ━━━'));
    console.log(chalk.bold('From:      ') + walletData.address.substring(0, 16) + '...');
    console.log(chalk.bold('To:        ') + to.substring(0, 16) + '...');
    console.log(chalk.bold('Amount:    ') + chalk.green(amount + ' SAYM'));
    console.log(chalk.bold('Gas Limit: ') + options.gasLimit);
    console.log(chalk.bold('Gas Price: ') + options.gasPrice);
    console.log(chalk.bold('Max Cost:  ') + chalk.yellow((parseFloat(amount) + (parseInt(options.gasLimit) * parseInt(options.gasPrice))) + ' SAYM'));
    console.log(chalk.cyan('━'.repeat(30)));
    
    const txData = {
      type: 'TRANSFER',
      data: { 
        from: walletData.address, 
        to, 
        amount: parseFloat(amount) 
      },
      timestamp: Date.now()
    };
    
    const signature = await walletCLI.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: walletData.publicKey,
      gasLimit: parseInt(options.gasLimit),
      gasPrice: parseInt(options.gasPrice),
      nonce: addressData.nonce
    };
    
    const result = await apiCall('/broadcast', {
      method: 'POST',
      body: JSON.stringify(signedTx)
    });
    
    console.log(chalk.green('\n✅ Transaction broadcast successfully!'));
    console.log(chalk.bold('TX ID: ') + chalk.white(result.txId));
    console.log(chalk.gray('Waiting for block confirmation...\n'));
  });

// Stake command
program
  .command('stake <amount>')
  .description('Stake SAYM tokens')
  .option('-g, --gas-limit <limit>', 'Gas limit', '100000')
  .option('-p, --gas-price <price>', 'Gas price', '1')
  .action(async (amount, options) => {
    const walletData = loadWallet();
    const walletCLI = new SaymanWalletCLI(walletData.privateKey);
    await walletCLI.initialize();
    
    const addressData = await apiCall(`/address/${walletData.address}`);
    
    console.log(chalk.cyan('\n━━━ Staking Transaction ━━━'));
    console.log(chalk.bold('Address:   ') + walletData.address.substring(0, 16) + '...');
    console.log(chalk.bold('Amount:    ') + chalk.green(amount + ' SAYM'));
    console.log(chalk.bold('Gas Limit: ') + options.gasLimit);
    console.log(chalk.bold('Gas Price: ') + options.gasPrice);
    console.log(chalk.cyan('━'.repeat(30)));
    
    const txData = {
      type: 'STAKE',
      data: { 
        from: walletData.address, 
        amount: parseFloat(amount) 
      },
      timestamp: Date.now()
    };
    
    const signature = await walletCLI.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: walletData.publicKey,
      gasLimit: parseInt(options.gasLimit),
      gasPrice: parseInt(options.gasPrice),
      nonce: addressData.nonce
    };
    
    const result = await apiCall('/broadcast', {
      method: 'POST',
      body: JSON.stringify(signedTx)
    });
    
    console.log(chalk.green('\n✅ Stake transaction broadcast!'));
    console.log(chalk.bold('TX ID: ') + chalk.white(result.txId));
    console.log(chalk.gray('You will become a validator once the block is mined.\n'));
  });

// Unstake command
program
  .command('unstake')
  .description('Unstake SAYM tokens')
  .option('-g, --gas-limit <limit>', 'Gas limit', '100000')
  .option('-p, --gas-price <price>', 'Gas price', '1')
  .action(async (options) => {
    const walletData = loadWallet();
    const walletCLI = new SaymanWalletCLI(walletData.privateKey);
    await walletCLI.initialize();
    
    const addressData = await apiCall(`/address/${walletData.address}`);
    
    if (addressData.stake === 0) {
      console.log(chalk.red('\n❌ No stake to unstake\n'));
      return;
    }
    
    console.log(chalk.cyan('\n━━━ Unstaking Transaction ━━━'));
    console.log(chalk.bold('Address: ') + walletData.address.substring(0, 16) + '...');
    console.log(chalk.bold('Stake:   ') + chalk.yellow(addressData.stake + ' SAYM'));
    console.log(chalk.cyan('━'.repeat(30)));
    
    const txData = {
      type: 'UNSTAKE',
      data: { from: walletData.address },
      timestamp: Date.now()
    };
    
    const signature = await walletCLI.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: walletData.publicKey,
      gasLimit: parseInt(options.gasLimit),
      gasPrice: parseInt(options.gasPrice),
      nonce: addressData.nonce
    };
    
    const result = await apiCall('/broadcast', {
      method: 'POST',
      body: JSON.stringify(signedTx)
    });
    
    console.log(chalk.green('\n✅ Unstake initiated!'));
    console.log(chalk.bold('TX ID: ') + chalk.white(result.txId));
    console.log(chalk.yellow(`Funds will be available at block ${result.unlockBlock}\n`));
  });

// Deploy contract command
program
  .command('deploy <file>')
  .description('Deploy smart contract from file')
  .option('-g, --gas-limit <limit>', 'Gas limit', '1000000')
  .option('-p, --gas-price <price>', 'Gas price', '1')
  .action(async (file, options) => {
    const walletData = loadWallet();
    const walletCLI = new SaymanWalletCLI(walletData.privateKey);
    await walletCLI.initialize();
    
    if (!fs.existsSync(file)) {
      console.log(chalk.red(`\n❌ File not found: ${file}\n`));
      return;
    }
    
    const code = fs.readFileSync(file, 'utf8');
    const addressData = await apiCall(`/address/${walletData.address}`);
    
    console.log(chalk.cyan('\n━━━ Contract Deployment ━━━'));
    console.log(chalk.bold('File:      ') + file);
    console.log(chalk.bold('Size:      ') + code.length + ' bytes');
    console.log(chalk.bold('Gas Limit: ') + options.gasLimit);
    console.log(chalk.bold('Gas Price: ') + options.gasPrice);
    console.log(chalk.cyan('━'.repeat(30)));
    
    const txData = {
      type: 'CONTRACT_DEPLOY',
      data: { from: walletData.address, code },
      timestamp: Date.now()
    };
    
    const signature = await walletCLI.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: walletData.publicKey,
      gasLimit: parseInt(options.gasLimit),
      gasPrice: parseInt(options.gasPrice),
      nonce: addressData.nonce
    };
    
    const result = await apiCall('/broadcast', {
      method: 'POST',
      body: JSON.stringify(signedTx)
    });
    
    console.log(chalk.green('\n✅ Contract deployment broadcast!'));
    console.log(chalk.bold('TX ID: ') + chalk.white(result.txId));
    console.log(chalk.gray('Contract will be deployed once the block is mined.\n'));
  });

// Call contract command
program
  .command('call <contract> <method> [args]')
  .description('Call smart contract method')
  .option('-g, --gas-limit <limit>', 'Gas limit', '500000')
  .option('-p, --gas-price <price>', 'Gas price', '1')
  .action(async (contract, method, argsJson, options) => {
    const walletData = loadWallet();
    const walletCLI = new SaymanWalletCLI(walletData.privateKey);
    await walletCLI.initialize();
    
    const args = argsJson ? JSON.parse(argsJson) : {};
    const addressData = await apiCall(`/address/${walletData.address}`);
    
    console.log(chalk.cyan('\n━━━ Contract Call ━━━'));
    console.log(chalk.bold('Contract:  ') + contract.substring(0, 16) + '...');
    console.log(chalk.bold('Method:    ') + method);
    console.log(chalk.bold('Arguments: ') + JSON.stringify(args));
    console.log(chalk.bold('Gas Limit: ') + options.gasLimit);
    console.log(chalk.cyan('━'.repeat(30)));
    
    const txData = {
      type: 'CONTRACT_CALL',
      data: { 
        from: walletData.address, 
        contractAddress: contract, 
        method, 
        args 
      },
      timestamp: Date.now()
    };
    
    const signature = await walletCLI.signTransaction(txData);
    
    const signedTx = {
      ...txData,
      signature: signature,
      publicKey: walletData.publicKey,
      gasLimit: parseInt(options.gasLimit),
      gasPrice: parseInt(options.gasPrice),
      nonce: addressData.nonce
    };
    
    const result = await apiCall('/broadcast', {
      method: 'POST',
      body: JSON.stringify(signedTx)
    });
    
    console.log(chalk.green('\n✅ Contract call broadcast!'));
    console.log(chalk.bold('TX ID: ') + chalk.white(result.txId));
    console.log(chalk.gray('Contract will execute once the block is mined.\n'));
  });

// Network info command
program
  .command('network')
  .description('Show network information')
  .action(async () => {
    const network = await apiCall('/network');
    const stats = await apiCall('/stats');
    
    console.log(chalk.cyan('\n━━━ Network Information ━━━'));
    console.log(chalk.bold('Network:     ') + chalk.white(network.network));
    console.log(chalk.bold('Chain ID:    ') + chalk.white(network.chainId));
    console.log(chalk.bold('Block Height:') + chalk.white(stats.blocks));
    console.log(chalk.bold('Validators:  ') + chalk.white(stats.validators));
    console.log(chalk.bold('Total Stake: ') + chalk.green(stats.totalStake + ' SAYM'));
    console.log(chalk.bold('Block Time:  ') + chalk.white((network.blockTime / 1000) + 's'));
    console.log(chalk.bold('Block Reward:') + chalk.green(network.blockReward + ' SAYM'));
    console.log(chalk.bold('Min Stake:   ') + chalk.yellow(network.minStake + ' SAYM'));
    console.log(chalk.bold('Faucet:      ') + (network.faucetEnabled ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')));
    
    console.log(chalk.cyan('\n━━━ Gas Configuration ━━━'));
    console.log(chalk.bold('Min Gas Price:   ') + network.gasLimits.minGasPrice);
    console.log(chalk.bold('Max Gas Per TX:  ') + network.gasLimits.maxGasPerTx.toLocaleString());
    console.log(chalk.bold('Max Gas Per Block:') + network.gasLimits.maxGasPerBlock.toLocaleString());
    
    console.log(chalk.cyan('\n━━━ Gas Costs ━━━'));
    console.log(chalk.bold('Transfer:        ') + network.gasCosts.TRANSFER);
    console.log(chalk.bold('Stake/Unstake:   ') + network.gasCosts.STAKE);
    console.log(chalk.bold('Contract Deploy: ') + network.gasCosts.CONTRACT_DEPLOY);
    console.log(chalk.bold('Contract Call:   ') + network.gasCosts.CONTRACT_CALL_BASE);
    console.log(chalk.cyan('━'.repeat(30)) + '\n');
  });

// Validators command
program
  .command('validators')
  .description('List all validators')
  .action(async () => {
    const data = await apiCall('/validators');
    
    console.log(chalk.cyan('\n━━━ Active Validators ━━━\n'));
    
    const table = new Table({
      head: [
        chalk.bold('Address'),
        chalk.bold('Stake'),
        chalk.bold('%'),
        chalk.bold('Missed')
      ],
      style: { head: ['cyan'] }
    });
    
    data.validators.forEach(v => {
      table.push([
        v.address.substring(0, 16) + '...',
        chalk.green(v.stake + ' SAYM'),
        chalk.yellow(v.percentage + '%'),
        v.missedBlocks
      ]);
    });
    
    console.log(table.toString());
    
    console.log(chalk.cyan('\n━━━ Network Stats ━━━'));
    console.log(chalk.bold('Total Validators: ') + data.totalValidators);
    console.log(chalk.bold('Total Stake:      ') + chalk.green(data.totalStake + ' SAYM'));
    console.log(chalk.bold('Estimated APR:    ') + chalk.yellow(data.estimatedAPR + '%'));
    console.log();
  });

// Estimate gas command
program
  .command('estimate <type> <data>')
  .description('Estimate gas for transaction')
  .action(async (type, dataJson) => {
    const data = JSON.parse(dataJson);
    
    const result = await apiCall('/estimate-gas', {
      method: 'POST',
      body: JSON.stringify({ type, data })
    });
    
    console.log(chalk.cyan('\n━━━ Gas Estimation ━━━'));
    console.log(chalk.bold('Estimated Gas:        ') + chalk.white(result.estimatedGas));
    console.log(chalk.bold('Recommended Limit:    ') + chalk.green(result.recommendedGasLimit));
    console.log(chalk.bold('Min Gas Price:        ') + chalk.white(result.minGasPrice));
    console.log(chalk.bold('Est. Cost (min price):') + chalk.yellow((result.recommendedGasLimit * result.minGasPrice) + ' wei'));
    console.log(chalk.cyan('━'.repeat(30)) + '\n');
  });

// Set API endpoint
program
  .command('config <endpoint>')
  .description('Set API endpoint (e.g., http://localhost:3000/api)')
  .action((endpoint) => {
    API_BASE = endpoint;
    process.env.SAYMAN_API = endpoint;
    console.log(chalk.green(`✅ API endpoint set to: ${endpoint}\n`));
  });

program.parse();