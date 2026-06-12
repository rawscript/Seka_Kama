const ReactDOM = require('react-dom-lib');

// Re-export everything from the real react-dom
module.exports = {
  ...ReactDOM,
  
  // Explicitly export common functions to ensure they are available to consumers
  createPortal: ReactDOM.createPortal,
  flushSync: ReactDOM.flushSync,
  version: ReactDOM.version,

  // Polyfill unmountComponentAtNode if missing (React 19)
  unmountComponentAtNode: ReactDOM.unmountComponentAtNode || ((container) => {
    if (ReactDOM.createRoot && container) {
       // In React 18/19, we'd normally use root.unmount(), 
       // but for a simple shim we just try to clear it.
       return false; 
    }
    return false;
  }),

  // Polyfill findDOMNode for React 19 compatibility
  findDOMNode: ReactDOM.findDOMNode || ((inst) => {
    if (!inst) return null;
    if (inst instanceof Element) return inst;
    return inst._reactInternalFiber?.stateNode || inst._reactInternals?.stateNode || null;
  }),
};
