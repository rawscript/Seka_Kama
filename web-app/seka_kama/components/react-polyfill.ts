import ReactDOM from 'react-dom';

if (typeof window !== 'undefined' && !ReactDOM.findDOMNode) {
    // @ts-ignore
    ReactDOM.findDOMNode = (componentOrElement) => {
        if (!componentOrElement) return null;
        if (componentOrElement instanceof HTMLElement) return componentOrElement;
        // Fallback to searching the instance for an element node
        return componentOrElement.updater?.getPublicInstance() || null;
    };
}