// eslint-disable-next-line prefer-arrow-callback
const component = (name) => Object.defineProperty(function() {
    return name;
}, "name", { value : name });

export default component;
