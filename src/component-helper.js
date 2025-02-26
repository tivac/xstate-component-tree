/**
 * @typedef {import("xstate").AnyStateNodeDefinition} StateNode
 * @typedef {() => object | object} Props
 * @typedef {{ component: Function, props: Props }} ComponentAndProps
 */

/**
 * @param {Function | ComponentAndProps} child - Component instance, or component loader
 * @param {StateNode} node - Xstate node data
 * @returns {StateNode} an xstate node containing component information in its meta
 */
const componentHelper = (child, node = {}) => {
    /**
     * Handle both bare component & { component, props } via destructuring & default values
     * 1. state : component(UIComponent, {})
     * 2. state : component{ component : UIComponent, props : () => { ... } | { ... }}
     */
    const {
        component = child,
        props : properties = false,
        
        ...meta
    } = child;

    // meta will always be an object since it's a rest param, fine to assign to
    meta.load = (...parameters) => [
        // Run arrow functions (function w/o a prototype), anything else is assumed to be
        // already a component
        component && typeof component === "function" && !component.prototype ?
            component(...parameters) :
            component,
        typeof properties === "function" ?
            properties(...parameters) :
            properties,
    ];

    node.meta = node.meta ? Object.assign(node.meta, meta) : meta;

    return node;
};

export {
    componentHelper,
};
