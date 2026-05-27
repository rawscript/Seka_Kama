/**
 * react-polyfill.ts
 *
 * Kepler.gl (via react-sortable-hoc) calls ReactDOM.findDOMNode, which was
 * removed in React 19. We shim it back onto the ReactDOM object so Kepler
 * doesn't crash at runtime.
 *
 * We cast through `unknown` → `Record<string, unknown>` to avoid TypeScript
 * complaining that `findDOMNode` no longer exists on the ReactDOM type.
 */
import ReactDOM from 'react-dom';

if (typeof window !== 'undefined') {
  const rd = ReactDOM as unknown as Record<string, unknown>;

  if (!rd['findDOMNode']) {
    rd['findDOMNode'] = (componentOrElement: unknown): Element | null => {
      if (!componentOrElement) return null;
      if (componentOrElement instanceof Element) return componentOrElement;
      // Last-resort: try to pull the underlying DOM node from a React
      // class-component instance (the only case react-sortable-hoc needs).
      const inst = componentOrElement as Record<string, unknown>;
      const node = inst['_reactInternals']
        ?? inst['_reactInternalFiber']
        ?? null;
      if (node && (node as Record<string, unknown>)['stateNode'] instanceof Element) {
        return (node as Record<string, unknown>)['stateNode'] as Element;
      }
      return null;
    };
  }
}
