export const asyncValue = (result, delay = 0) => new Promise((resolve) =>
    setTimeout(() => resolve(result), delay)
);

export const asyncLoad = (...parameters) => () => asyncValue(...parameters);

export const deferred = () => {
    const { promise : p, resolve, reject } = Promise.withResolvers();

    p.resolve = resolve;
    p.reject = reject;

    return p;
};
