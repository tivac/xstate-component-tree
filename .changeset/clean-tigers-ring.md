---
"xstate-component-tree": minor
---

Add machine info to each result

Otherwise root components of parallel sibling child machines can end up not being actually comparable.

```diff
[
    [Object: null prototype] {
+       machine: "(machine).child-one",
        path: false,
        component: [Function: child],
        props: false,
        children: []
    },
    [Object: null prototype] {
+       machine: "(machine).child-two",
        path: false,
        component: [Function: child],
        props: false,
        children: []
    }
]
```
