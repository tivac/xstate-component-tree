const deferred = () => {
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

export default deferred;
