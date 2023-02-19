---
"xstate-component-tree": minor
---

Component helper preserves `.meta` fields

Previous using the helper like this:

```js
helper(Component, {
    meta : {
        fooga : "wooga",
    },
});
```

would return an object with no `meta.fooga` property. Now those keys are properly preserved if they exist.

`meta.load` will **still be overwritten** if it exists, because it is required for the helper to function. A warning if it exists may be introduced in a future release.
