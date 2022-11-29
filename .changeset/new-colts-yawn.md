---
"xstate-component-tree": minor
---

Support for components at the root of machines

```js
createMachine({
  initial : "foo",
  
  meta : {
    component : RootComponent,
  },

  states : {
    foo : {
      meta : {
        component: FooComponent
      },
    },
  },
});
```

Previously `RootComponent` would be ignored, now it will be the first component in the tree and `FooComponent` will be placed as a child of it.
