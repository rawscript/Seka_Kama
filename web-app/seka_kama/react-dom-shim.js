import * as ReactDOM from 'react-dom';

// Re-export everything from the real react-dom
export * from 'react-dom';

/**
 * Polyfill findDOMNode for React 19 compatibility with older libraries 
 * like react-sortable-hoc (used by kepler.gl).
 * 
 * While findDOMNode is removed in React 19, we provide this export 
 * to satisfy Webpack's static analysis during the build.
 */
export const findDOMNode = ReactDOM.findDOMNode || ((inst) => {
  if (!inst) return null;
  if (inst instanceof Element) return inst;
  return inst._reactInternalFiber?.stateNode || inst._reactInternals?.stateNode || null;
});

export default ReactDOM;
