// Simple Counter Contract
function increment() {
    state.count = (state.count || 0) + 1;
  }
  
  function decrement() {
    state.count = (state.count || 0) - 1;
  }
  
  function getCount() {
    return state.count || 0;
  }
  
  function setValue(args) {
    state.count = args.value;
  }