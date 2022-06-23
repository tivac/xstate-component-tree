---
"xstate-component-tree": minor
---

Added `.send()` API

The `.send()` API is a simple passthrough to the interpreter for the root statechart being managed by `xstate-component-tree`, and is intended as a convenience function to make it easier to interact with a `ComponentTree` instance instead of a direct XState `Interpreter` reference.

[XState Docs on .send()](https://xstate.js.org/docs/guides/interpretation.html#sending-events)
