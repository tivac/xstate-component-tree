<div>
    LAYOUT

    <Children children={components} />
</div>

<script>
import { interpret } from "xstate";
import ComponentTree from "xstate-component-tree";

import statechart from "./statechart.js";

import Children from "./children.svelte";

const service = interpret(statechart);

let components = [];

new ComponentTree(service, (tree) => {
    components = tree;
});

service.start();
</script>