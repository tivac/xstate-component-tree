export const treeTeardown = (context) => {
    const { tree } = context;

    if(tree && tree.builder) {
        tree.builder.teardown();
    }

    context.tree = undefined;
};
