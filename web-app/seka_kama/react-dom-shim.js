import * as ReactDOM from 'react-dom-base';

// Re-export everything from the real react-dom (via the base alias)
export * from 'react-dom-base';

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
