<div>
    <p>LAYOUT RENDERED AT {Date.now()}</p>

    <code>{JSON.stringify($service.value)}</code>

    <p>
        <button on:click={() => service.send("NAV")}>Navigate</button>
    </p>

    <Children children={components} />
</div>

<script>
import ComponentTree from "xstate-component-tree";

import service from "./statechart.js";

import Children from "./children.svelte";

let components = [];

new ComponentTree(service, (tree) => {
    components = tree;
});

$: console.log(components);

service.start();
</script>