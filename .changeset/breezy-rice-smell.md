---
"xstate-component-tree": minor
---

New feature, `fromMachine()`!

`fromMachine()` is a new helper you can use to let you async-invoke a child machine inside your statechart. Now you can split out your logic _and_ efficiently load pieces of your application on-demand.

```js
import { fromMachine } from "xstate-component-tree/from-machine";

// ...

export const parentMachine = createMachine({
  // ...
  states : {
    // ...

    "load-child" : {
      invoke : [
        {
          id : "async-child",

          src : fromMachine(() =>
            import("./child.machine.js").then(({ childMachine }) => childMachine)
          ),
  
          onDone : "done",
  
          onError : {
            actions : onError,
            target : "error",
          },
        },
      ],
    },
  },
});
```
