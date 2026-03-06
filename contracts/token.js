// Simple Token Contract
function mint(args) {
    const { to, amount } = args;
    state.balances = state.balances || {};
    state.balances[to] = (state.balances[to] || 0) + amount;
    state.totalSupply = (state.totalSupply || 0) + amount;
  }
  
  function transfer(args) {
    const { to, amount } = args;
    const from = msg.sender;
    
    state.balances = state.balances || {};
    
    if ((state.balances[from] || 0) < amount) {
      throw new Error('Insufficient balance');
    }
    
    state.balances[from] -= amount;
    state.balances[to] = (state.balances[to] || 0) + amount;
  }
  
  function balanceOf(args) {
    state.balances = state.balances || {};
    return state.balances[args.address] || 0;
  }
  
  function totalSupply() {
    return state.totalSupply || 0;
  }