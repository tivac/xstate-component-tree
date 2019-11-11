# xstate-component-tree [![NPM Version](https://img.shields.io/npm/v/xstate-component-tree.svg)](https://www.npmjs.com/package/xstate-component-tree) [![NPM License](https://img.shields.io/npm/l/xstate-component-tree.svg)](https://www.npmjs.com/package/xstate-component-tree) [![NPM Downloads](https://img.shields.io/npm/dm/xstate-component-tree.svg)](https://www.npmjs.com/package/xstate-component-tree)

Utility method to wrap up an [XState](xstate.js.org) interpreter and read state meta information so your statechart can be used to create a tree of components to render.

## Installation

```bash
$> npm install xstate-component-tree
```

## Usage

Create an XState statechart, and then instantiate an XState interpreter with it.

```js
const { Machine, interpret } = require("xstate");

const statechart = Machine({
    initial : "one",

    states : {
        one : {},
    },
});

const service = interpret(statechart);

service.start();
```

Add `meta` objects to each state that you want to represent a component.

```js
Machine({
    initial : "one",

    states : {
        one : {
            meta : {
                component : MyComponent,
            },
        },
    },
});
```
Props for the components are also supported via the `props` key.

```js
    // ...
    one : {
        meta : {
            component : MyComponent,
            props : {
                prop1 : 1
            },
        },
    },
    // ...
```

Then pass an Xstate interpreter instance and a callback function to this module!
Don't forget to `.start()` the service!

```js
const { Machine, interpret } = require("xstate");
const componentTree = require("xstate-component-tree");

const statechart = Machine({
    // ...
});

const service = interpret(statechart);

service.start();

componentTree(service, (tree) => {
    // [{...}]
});
```

The second argument to the function will be called every time the machine transitions. It will pass the callback a new object representing all the views defined on currently active states, all correctly nested to match the structure of the statechart.

```js
componentTree(service, (tree) => {
    /**
     * 
     * tree will be something like this:
     * 
     * [{
     *     id: "machine-id",
     *     children: [{
     *         component: MyComponent,
     *         children: [],
     *         props: false
     *     }],
     * }]
     * 
     * or if there are nested components
     * 
     * [{
     *     id: "machine-id",
     *     children: [{
     *         component: MyComponent,
     *         props: false
     *         children : [{
     *             component : ChildComponent,
     *             props: {
     *                 one1 : 1
     *             },
     *             children: []
     *         }]
     *     }],
     * }]
     */
});
```

Each object in the `tree` array represents all currently active parallel states. If you aren't running multiple state machines, you can expect this array to always return an array containing a single object

This data structure can also contain components from any child statecharts you created using `invoke`, they will be correctly walked & monitored for transitions.

## Advanced Usage

You can dynamically load components using whatever functionality you like via the `load` key. To load components asynchronously return a promise or use `async`/`await`.

```js
    // ...
    one : {
        meta : {
            load : (ctx, event) => import("./my/component/from/here.js"),
        },
    },
    // ...
```

Dynamic `props` are also supported. They can load data asynchronously using promises or `async`/`await`.

```js
    // ...
    one : {
        meta : {
            component : MyComponent,
            props : (ctx, event) => ({
                prop1 : 1
            }),
        },
    },
    // ...
```

Both `load` and dynamic `props` functions will be passed the `context` and `event` params from xstate.

## Rendering Components

Assuming access to the tree built by `xstate-component-tree`, you can slot this into your UI layer
seamlessly!

Here's a file that exports a function to supply the `componentTree` callback to:

`tree.js`
```js
const { Machine, interpret } = require("xstate");
const componentTree = require("xstate-component-tree");

const statechart = Machine({
    // ...
});

const service = interpret(statechart);

service.start();

export default (callback) => componentTree(service, callback);
```

Let's put this `export` to good use and render out our component tree.
Here's a brief [svelte](svelte.dev) example:

```html
{#each components as { component, props, children }}
    <svelte:component this="{component}" {children} {...props} />
{/each}

<script>
import componentTree from "./tree.js";

let components;

componentTree(([ structure ]) => {
    // Our statechart doesn't contain any parallel states at the top level
    // So all components we render will exist in the first array element.
    components = structure;
});
</script>
```
