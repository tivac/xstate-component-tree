# xstate-component-tree [![NPM Version](https://img.shields.io/npm/v/xstate-component-tree.svg)](https://www.npmjs.com/package/xstate-component-tree) [![NPM License](https://img.shields.io/npm/l/xstate-component-tree.svg)](https://www.npmjs.com/package/xstate-component-tree) [![NPM Downloads](https://img.shields.io/npm/dm/xstate-component-tree.svg)](https://www.npmjs.com/package/xstate-component-tree)

Utility method to wrap up an [XState](https://xstate.js.org) interpreter and read state meta information so your statechart can be used to create a tree of components to render.

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
const ComponentTree = require("xstate-component-tree");

const statechart = Machine({
    // ...
});

const service = interpret(statechart);

new ComponentTree(service, (tree) => {
    // ...
});
```

The second argument to the function will be called every time the machine transitions. It will pass the callback a new object representing all the views defined on currently active states, all correctly nested to match the structure of the statechart. Each element in the response will also contain a `path` value corresponding to the the specific state the object represents.

```js
new ComponentTree(service, (tree) => {
    /**
     * 
     * tree will be something like this
     * 
     * [{
     *     path : "one",
     *     component: MyComponent,
     *     children: [],
     *     props: false,
     * }]
     * 
     * or if there are nested components
     * 
     * [{
     *     path : "one",
     *     component: MyComponent,
     *     props: false
     *     children : [{
     *         path : "one.two",
     *         component : ChildComponent,
     *         props: {
     *             one : 1
     *         },
     *         children: []
     *     }]
     * }]
     * 
     */ 
});
```

This data structure can also contain components from any child statecharts you created using `invoke`, they will be correctly walked & monitored for transitions and appear in their expected position within the hierarchy. This lets you compose a larger statechart from several smaller ones and still have them all contribute components to the app.

## Advanced Usage

You can dynamically load components or props using whatever functionality you like via the `load` key. To load components asynchronously return a promise or use `async`/`await`.

```js
// ...
one : {
    meta : {
        load : () => import("./my/component/from/here.js"),
    },
},
// ...
```

Dynamic props are also supported. To return props return an array from `load` where the first value is the component and the second is the props for the component. Both values support a returned promise.

```js
// ...
one : {
    meta : {
        load : (context) => [
            import("./my/component/from/here.js"), 
            {
                prop1 : context.prop1
            },
        ],
    },
},
// ...
```

The `load` function will be passed the `context` and `event` params from xstate.

## The `component` helper

`xstate-component-tree/component` has a named export called `component`, which is a small function to abstract away assignment to the `meta` object in each state node that needs a component. It's a convenience wrapper that makes writing with `xstate-component-tree` a little bit cleaner.

```diff
import { component } from "xstate-component-tree/component";

// ...
- one : {
-     meta: {
-         component: OneComponent,
-     },
- },
+ one : component(OneComponent),
```

Setting props for the component is handled by passing an object with `component` and `props` keys.

```diff
import { component } from "xstate-component-tree/component";

// ...
- one : {
-     meta: {
-        component : MyComponent,
-        props : {
-            prop1 : 1
-        },
-     },
- },
+ one : component({
+    component : OneComponent,
+    props : {
+        prop1 : 1,
+    },
+ }),
```

Both the `component` and `props` key can be a function, they'll be passed the same `context` and `event` args that are normally passed to `load()` methods.

```diff
import { component } from "xstate-component-tree/component";

// ...
- one : {
-     meta : {
-         load : (context, event) => [
-             import("./my/component/from/here.js"),
-             {
-                 prop1 : context.prop1,
-             },
-         ],
-     },
- },
+ one : component({
+    component : () => import("./my/component/from/here.js"),
+    props : (context) => ({
+        prop1 : context.prop1,
+    }),
+ }),
```


## API

### `ComponentTree`

#### `new ComponentTree(interpreter, callback, [options])`

- `interpreter`, and instance of a xstate interpreter
- `callback`, a function that will be executed each time a new tree of components is ready
- `options`, an optional object containing [configuration values](#options) for the library.

The `callback` functions receives two arguments, the first is your assembled tree of components & props. The second is an object with some useful information on it:

- `.state`, the returned xstate `State` object for the root machine
- `.broadcast()`, a bound version of the [`.broadcast()` API documented below](#broadcasteventname--eventobject-payload)
- `.can()`, a bound version of the [`.can()` API documented below](#caneventname--eventobject-payload)
- `.hasTag()`, a bound version of the [`.hasTag()` API documented below](#hastagtag)
- `.matches()`, a bound version of the [`.matches()` API documented below](#matchesstatename)

#### `options`

- `cache` (default `true`), a boolean determining whether or not the value of `load()` functions should be cached. This can be overriden by setting `meta.cache` on any state in the tree where caching needs to be disabled.

- `stable` (default: `false`), tells the library to sort states alphabetically before walking them at each tier to help ensure that the component output is more consistent between state transitions.

- `verbose` (default: `false`), logs out info about the internal workings & decisions.

### `ComponentTree` instance methods

#### `.broadcast(eventName | eventObject, payload)`

Calls the xstate `.send()` method on every running interpreter in the hierarchy. This is especially useful to avoid the use of the `autoforward` option on all of your invoked child machines.

- `eventName` is a string event to be sent
- `eventObject` is an object with a `type` property of the event name, along with other optional fields
- `payload` is an object of optional fields to be added to the event object

#### `.can(eventName | eventObject)`

Calls the xstate `.can()` method on every running interpreter in the hierarchy.

- `eventName` is a string event to be sent
- `eventObject` is an object with a `type` property of the event name, along with other optional fields

#### `.hasTag(tag)`

- `tag` is a string, which can be defined on states using the `tags` property

Calls the [xstate `.hasTag()` method](https://xstate.js.org/docs/guides/states.html#state-hastag-tag) against all the running machines and returns the result, stopping at the first successful match.

#### `.matches(stateName)`

- `stateName` is a full or partial state value specified as a string

Calls the [xstate `.matches()` method](https://xstate.js.org/docs/guides/states.html#state-matches-parentstatevalue) against all the running machines and returns the result, stopping at the first successful match.

### `component()` helper

The `component` helper returns an `xstate` node as an object literal, it is solely a convenience method for statechart authors.

#### `component(Component | () => {}, [node])`

- `Component` is either a component or an arrow function that will be executed. It supports functions that return either a component or a `Promise`.
- `node` is a valid xstate node, the `meta` object will be created and mixed-in by the `component()`.

#### `component({ component : Component | () => {}, props : {...} | () => {} })`

- `component` is either a raw Component or an arrow function that will be executed.  It supports returning either a value or a `Promise`.
- `props` is either a props object or a function that will be executed. It supports function returning either a value or a `Promise`.

## Rendering Components

Once you have the tree of components, how you assembled that into your view layer is entirely up to you! Here's a brief [svelte](https://svelte.dev) example.

```html
{#each components as { path, component, props, children } (path)}
    <svelte:component this={component} {...props} {children} />
{/each}

<script>
export let components;
</script>
```
