/**
 *
 * @param {Function} child - Component instance, or component loader
 * @param {*} node - Xstate node data
 * @returns an xstate node containing component information in its meta
 */
export default (child, node = {}) => {
    /**
     * Handle both bare component & { component, props } via destructuring & default values
     * 1. state : component(UIComponent, {})
     * 2. state : component{ component : UIComponent, props : () => { ... } | { ... }}
     */
    const {
        component = child,
        props = false,
        
        ...meta
    } = child;

    // meta will always be an object since it's a rest param, fine to assign to
    meta.load = (...args) => [
        // Run arrow functions (function w/o a prototype), anything else is assumed to be
        // already a component
        component && typeof component === "function" && !component.prototype ?
            component(...args) :
            component,
        typeof props === "function" ?
            props(...args) :
            props,
    ];

    node.meta = meta;

    return node;
};
