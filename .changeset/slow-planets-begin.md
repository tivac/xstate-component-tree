---
"xstate-component-tree": major
---

Matching state and invoke names would cause `xstate-component-tree` to fail to return child components in some cases because internally it named them the same thing and stomped all over itself.

```
states : {
    foo : {
        invoke : {
            id : "foo",
            // ...
        },
    },
},
```

This should work now.

**BREAKING CHANGE**: All `machine` values in the output that previously looked like `root.foo` will now look like `root.#foo`, in order to help differentiate the child machine `id` from the parent state path.
