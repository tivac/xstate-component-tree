<div>
    LAYOUT

    {#each machines as { id, children }}
        {#each children as child}
            <svelte:component
                this={child.component}
                children={child.children}
                {...child.props}
            />
        {/each}
    {/each}
</div>

<script>
import { interpret } from "xstate";
import componentTree from "xstate-component-tree";

import statechart from "./statechart.js";

const service = interpret(statechart);

let machines = [];

componentTree(service, (tree) => {
    machines = tree;
});

service.start();
</script>