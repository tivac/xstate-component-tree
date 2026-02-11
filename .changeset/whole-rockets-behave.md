---
"xstate-component-tree": major
---

### BREAKING CHANGE

`load` signature changed from `load(context, event)` to `load({ context, event })` to better match `xstate@5`.

### Fixes

Fixes the `event` param not being passed to `load` functions. Under the covers this is accomplished by monkey-patching `Actor.send()` because unfortunately it's not exposed in `xstate@5` except via the inspection API. It's a nice API and I'm considering refactoring to use it in the future, but we're not there yet.

More context on why monkey-patching was necessary is available here:

https://github.com/statelyai/xstate/issues/4074
https://github.com/statelyai/xstate/discussions/4649
