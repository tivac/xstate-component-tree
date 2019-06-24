// Create lookup object for all current states that have component metadata attached
// these are the only states that are even worth considering for rendering
const valid = ({ tree, value }, prefix = false) => {
    const states = tree.stateNode.getStateNodes(value).reduce((map, { path, meta }) => {
        if(meta) {
            map.set((prefix ? [ prefix, ...path ] : path).join("."), meta);
        }

        return map;
    }, new Map());

    return states;
};

export default valid;
