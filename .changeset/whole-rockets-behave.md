---
"xstate-component-tree": major
---

BREAKING: `load` signature changed

To better match `xstate@5` the signature for the `load` function changed from `(context, event) => ...` to `({ context, event }) => ...`

### Fixes

Fixes the `event` param not being passed to `load` functions. Under the covers this is accomplished by monkey-patching `Actor.send()` because unfortunately it's not exposed in `xstate@5` except via the inspection API. It's a nice API and I'm considering refactoring to use it in the future, but we're not there yet.

More context on why monkey-patching was necessary is available here:

https://github.com/statelyai/xstate/issues/4074
https://github.com/statelyai/xstate/discussions/4649
