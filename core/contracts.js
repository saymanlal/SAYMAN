import vm from 'vm';
import crypto from 'crypto';

class ContractEngine {
  constructor(state) {
    this.state = state;
  }

  generateContractAddress(creator, timestamp) {
    return crypto
      .createHash('sha256')
      .update(creator + timestamp.toString())
      .digest('hex')
      .substring(0, 40);
  }

  deploy(from, code, timestamp) {
    const address = this.generateContractAddress(from, timestamp);
    
    if (code.length > 10000) {
      throw new Error('Contract code too large');
    }

    // Validate code syntax
    try {
      new vm.Script(code);
    } catch (error) {
      throw new Error('Invalid contract code: ' + error.message);
    }

    const contract = {
      address,
      creator: from,
      code,
      state: {},
      createdAt: timestamp
    };

    this.state.setContract(address, contract);
    
    console.log(`✓ Contract deployed at ${address.substring(0, 8)}...`);
    
    return address;
  }

  call(from, contractAddress, method, args) {
    const contract = this.state.getContract(contractAddress);
    
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Create sandbox context
    const sandbox = {
      state: contract.state,
      msg: {
        sender: from
      },
      balanceOf: (address) => this.state.getBalance(address),
      transfer: (to, amount) => {
        // This will be executed and state updated after contract execution
        return { type: 'transfer', to, amount };
      },
      console: {
        log: (...args) => {
          // Safe console for debugging
          console.log('[Contract]', ...args);
        }
      }
    };

    // Create restricted context
    const context = vm.createContext(sandbox);

    // Wrap contract code to expose methods
    const wrappedCode = `
      ${contract.code}
      
      if (typeof ${method} === 'function') {
        ${method}(${JSON.stringify(args)});
      } else {
        throw new Error('Method not found: ${method}');
      }
    `;

    try {
      // Execute with timeout
      const script = new vm.Script(wrappedCode);
      script.runInContext(context, {
        timeout: 1000,
        displayErrors: true
      });

      // Update contract state
      contract.state = sandbox.state;
      this.state.setContract(contractAddress, contract);

      console.log(`✓ Contract ${contractAddress.substring(0, 8)}... executed ${method}()`);

      return {
        success: true,
        state: contract.state
      };

    } catch (error) {
      console.error(`✗ Contract execution failed: ${error.message}`);
      throw new Error('Contract execution failed: ' + error.message);
    }
  }

  getContract(address) {
    return this.state.getContract(address);
  }

  getAllContracts() {
    return this.state.getAllContracts();
  }
}

export default ContractEngine;