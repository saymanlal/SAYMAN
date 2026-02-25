import Wallet from './core/wallet.js';

const wallet = new Wallet();

console.log('\n╔════════════════════════════════════════╗');
console.log('║         NEW WALLET CREATED             ║');
console.log('╚════════════════════════════════════════╝\n');
console.log('Address:     ', wallet.getAddress());
console.log('Public Key:  ', wallet.getPublicKey());
console.log('Private Key: ', wallet.getPrivateKey());
console.log('\n⚠️  SAVE YOUR PRIVATE KEY SECURELY!');
console.log('⚠️  Never share it with anyone!\n');