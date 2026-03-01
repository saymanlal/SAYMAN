import vm from 'vm';
import crypto from 'crypto';

class ContractEngine {
  constructor(state, gasCalculator) {
    this.state = state;
    this.gas = gasCalculator;
  }

  generateContractAddress(creator, timestamp) {
    return crypto
      .createHash('sha256')
      .update(creator + timestamp.toString())
      .digest('hex')
      .substring(0, 40);
  }

  deploy(from, code, timestamp, gasTracker) {
    const address = this.generateContractAddress(from, timestamp);
    
    if (code.length > 100000) {
      throw new Error('Contract code too large');
    }

    // Charge gas for code size
    const codeGas = Math.floor(code.length / 10);
    this.gas.chargeGas(gasTracker, codeGas);

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
      createdAt: timestamp,
      gasUsed: gasTracker.gasUsed
    };

    this.state.setContract(address, contract);
    
    console.log(`✓ Contract deployed at ${address.substring(0, 8)}... (gas: ${gasTracker.gasUsed})`);
    
    return address;
  }

  call(from, contractAddress, method, args, gasTracker, gasLimit) {
    const contract = this.state.getContract(contractAddress);
    
    if (!contract) {
      throw new Error('Contract not found');
    }

    // Check state size limit
    const stateSize = JSON.stringify(contract.state).length;
    if (stateSize > this.gas.limits.maxStateSize) {
      throw new Error('Contract state too large');
    }

    // Create instrumented sandbox
    const sandbox = {
      state: contract.state,
      msg: { sender: from },
      gasTracker: gasTracker,
      gasLimit: gasLimit,
      gasCalculator: this.gas,
      
      // Instrumented balanceOf
      balanceOf: (address) => {
        this.gas.chargeGas(gasTracker, this.gas.gasCosts.STATE_READ);
        return this.state.getBalance(address);
      },
      
      // Instrumented state access
      _readState: () => {
        this.gas.chargeGas(gasTracker, this.gas.gasCosts.STATE_READ);
      },
      
      _writeState: () => {
        this.gas.chargeGas(gasTracker, this.gas.gasCosts.STATE_WRITE);
      },
      
      console: {
        log: (...args) => {
          this.gas.chargeGas(gasTracker, 1);
          console.log('[Contract]', ...args);
        }
      }
    };

    // Wrap state access
    const wrappedState = new Proxy(contract.state, {
      get: (target, prop) => {
        sandbox._readState();
        return target[prop];
      },
      set: (target, prop, value) => {
        sandbox._writeState();
        target[prop] = value;
        return true;
      }
    });

    sandbox.state = wrappedState;

    // Create restricted context
    const context = vm.createContext(sandbox);

    // Wrap contract code with gas metering
    const wrappedCode = `
      (function() {
        ${contract.code}
        
        if (typeof ${method} === 'function') {
          return ${method}(${JSON.stringify(args)});
        } else {
          throw new Error('Method not found: ${method}');
        }
      })();
    `;

    try {
      // Execute with timeout
      const script = new vm.Script(wrappedCode);
      const result = script.runInContext(context, {
        timeout: this.gas.limits.maxExecutionTime,
        displayErrors: true
      });

      // Check gas limit
      if (gasTracker.gasUsed > gasLimit) {
        throw new Error('Out of gas');
      }

      // Update contract state
      contract.state = Object.assign({}, wrappedState);
      this.state.setContract(contractAddress, contract);

      console.log(`✓ Contract ${contractAddress.substring(0, 8)}... executed ${method}() (gas: ${gasTracker.gasUsed})`);

      return {
        success: true,
        gasUsed: gasTracker.gasUsed,
        result: result
      };

    } catch (error) {
      console.error(`✗ Contract execution failed: ${error.message}`);
      throw error;
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