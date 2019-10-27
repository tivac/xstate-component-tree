# xstate-component-tree [![NPM Version](https://img.shields.io/npm/v/xstate-component-tree.svg)](https://www.npmjs.com/package/xstate-component-tree) [![NPM License](https://img.shields.io/npm/l/xstate-component-tree.svg)](https://www.npmjs.com/package/xstate-component-tree) [![NPM Downloads](https://img.shields.io/npm/dm/xstate-component-tree.svg)](https://www.npmjs.com/package/xstate-component-tree)

Utility method to wrap up an [XState](xstate.js.org) interpreter and read state meta information so your statechart can be used to create a tree of components to render.

## Installation

```bash
$> npm install xstate-component-tree
```

## Usage

Create an XState statechart, and then instantiate an XState interpreter instance using that statechart.

```js
const { Machine, interpret } = require("xstate");

const statechart = Machine({
    initial : "one",

    states : {
        one : {},
    },
});

const service = interpret(statechart);
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

Then pass the interpreter instance and a callback function to this module!

```js
const { Machine, interpret } = require("xstate");
const componentTree = require("xstate-component-tree");

const statechart = Machine({
    // ...
});

const service = interpret(statechart);

componentTree(service, (tree) => {
    // 
});
```

The second argument to the function will be called every time the machine transitions. It will pass the callback a new object representing all the views defined on currently active states, all correctly nested to match the structure of the statechart.

```js
componentTree(service, (tree) => {
    /**
     * 
     * tree will be something like this
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
     * 
     */ 
});
```

This data structure can also contain components from any child statecharts you created using `invoke`, they will be correctly walked & monitored for transitions.

## Advanced Usage

You can dynamically load components using whatever functionality you like via the `load` key. To load components asynchronously return a promise or use `async`/`await`.

```js
    // ...
    one : {
        meta : {
            load : () => import("./my/component/from/here.js"),
        },
    },
    // ...
```

Dynamic props are also supported. They can load data asynchronously using promises or `async`/`await`.

```js
    // ...
    one : {
        meta : {
            component : MyComponent,
            props : () => ({
                prop1 : 1
            }),
        },
    },
    // ...
```

Both `load` and dynamic `props` functions will be passed the `context` and `event` params from xstate.

## Rendering Components

Once you have the tree of components, how you assembled that into your view layer is entirely up to you! Here's a brief [svelte](svelte.dev) example.

```html
{#each components as { component, props, children }}
    <svelte:component this={component} {children} {...props}>
{/each}

<script>
export let components;
</script>
```
