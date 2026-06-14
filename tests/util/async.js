export const asyncValue = (result, delay = 0) => new Promise((resolve) =>
    setTimeout(() => resolve(result), delay)
);

export const asyncLoad = (...parameters) => () => asyncValue(...parameters);

export const deferred = () => {
    let resolve;
    let reject;
    
    const p = new Promise((ok, no) => {
        resolve = ok;
        reject = no;
    });

    p.resolve = resolve;
    p.reject = reject;

    return p;
};
