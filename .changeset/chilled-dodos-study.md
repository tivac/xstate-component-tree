---
"xstate-component-tree": minor
---

Added observable API

Available on the `ComponentTree` instance as `.subscribe(callback)`, calls the callback function immediately with the most recent result and then will re-call it each time a build completes.

Follows the [svelte store contract](https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values-store-contract) which isn't *strictly* compliant with any official observable APIs but is extremely simple and usable.

The `callback` passed to `.subscribe(...)` will immediately be called with the most recent result of building the component tree (or `false` if it hasn't finished yet), and then for each complete tree building run after that the `callback` will be called with a single argument. The arg is an `Object` with a `null` prototype and the following properties:

- `tree`, nested component structures. This is the same as the first argument to the older `new ComponentTree(service, callback)` API.
- `state`, an [XState `State` instance](https://paka.dev/npm/xstate@4.32.1/api#36a51e9234ff1a4d) representing the most recent state of the root statechart.
- `matches(<state>)`, [`state.matches()`](https://xstate.js.org/docs/guides/states.html#state-matches-parentstatevalue) but for every statechart instance including any invoked statecharts.
- `hasTag(<tag>)`, [`state.hasTag()`](https://xstate.js.org/docs/guides/states.html#state-hastag-tag) but for every statechart instance including any invoked statecharts.
- `broadcast(<event>)`, [`service.send()`](https://xstate.js.org/docs/guides/interpretation.html#sending-events) but for every statechart instance including any invoked statecharts. Prefer using this instead of setting `invoke.autoForward` because it'll reduce the amount of junk events sent to invoked children.
