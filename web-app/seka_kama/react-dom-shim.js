import * as ReactDOM from 'react-dom-lib';

// Re-export everything from the real react-dom
export * from 'react-dom-lib';

/**
 * Explicitly re-export common functions to ensure Webpack's static analysis
 * finds them even through the alias.
 */
export const createPortal = ReactDOM.createPortal;
export const flushSync = ReactDOM.flushSync;
export const unmountComponentAtNode = ReactDOM.unmountComponentAtNode;
export const version = ReactDOM.version;

/**
 * Polyfill findDOMNode for React 19 compatibility with older libraries 
 * like react-sortable-hoc (used by kepler.gl).
 */
export const findDOMNode = ReactDOM.findDOMNode || ((inst) => {
  if (!inst) return null;
  if (inst instanceof Element) return inst;
  return inst._reactInternalFiber?.stateNode || inst._reactInternals?.stateNode || null;
});

export default ReactDOM;
