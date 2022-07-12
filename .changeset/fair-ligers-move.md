---
"xstate-component-tree": minor
---

Adding `.can()` API from XState

The `.can()` API is a simple passthrough to the interpreter for the root statechart being managed by `xstate-component-tree`, and is intended as a convenience function to make it easier to interact with a ComponentTree instance instead of a direct XState Interpreter reference.

From the XState docs on `.can()`:

> Determines whether sending the event will cause a non-forbidden transition to be selected, even if the transitions have no actions nor change the state value.