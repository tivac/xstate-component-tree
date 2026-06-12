---
"xstate-component-tree": minor
---

New feature, `fromMachine()`!

`fromMachine()` is a new helper you can use to let you async-invoke a child machine inside your statechart. Now you can split out your logic _and_ efficiently load pieces of your application on-demand.

```js
import { fromMachine } from "xstate-component-tree/from-machine";

// ...

export const parenteMachine = createMachine({
  // ...
  states : {
    // ...

    "load-child" : {
      invoke : [
        {
          id : "child",

          src : fromMachine(() =>
            import("./child.machine.js")
              .then(({ childMachine }) => childMachine)
          ),
  
          onDone : {
            actions : raise({ type : "DONE" }),
          },
  
          onError : {
            actions : [
              onError,
              raise({ type : "ERROR" }),
            ],
          },
        },
      ],
    },
  },
});
```
