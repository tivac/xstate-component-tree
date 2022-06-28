---
"xstate-component-tree": major
---

Always provide a valid initial value to subscribers

Previously if you called the `.subscribe()` method on a `ComponentTree` instance before the statechart had been processed the return value would be `false`. This meant that subscribers would have to add checks to do anything against the returned value, since they couldn't depend on the `.matches`/`.hasTag`/`.broadcast` APIs existing.

This change fixes that, and ensures that even if the statechart hasn't been walked yet the initial value stored has all the expected APIs, along with a reasonable value for the `tree` property of `[]`. There isn't a great fallback value for `.state` at this time though.
