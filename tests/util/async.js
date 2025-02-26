export const asyncValue = (result, delay = 0) => new Promise((resolve) =>
    setTimeout(() => resolve(result), delay)
);

export const asyncLoad = (...parameters) => () => asyncValue(...parameters);
