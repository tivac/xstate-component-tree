# Changelog

## 7.0.0

### Major Changes

- [#217](https://github.com/tivac/xstate-component-tree/pull/217) [`e711a23`](https://github.com/tivac/xstate-component-tree/commit/e711a23eeddc9fe4c621fe10cd20711f230afc3e) Thanks [@dependabot](https://github.com/apps/dependabot)! - # 🎉 xstate v5 support 🎉

  This release finally updates `xstate-component-tree` to work with modern versions of xstate. No major API changes within the library itself, mostly v4 to v5 stuff like [always sending `{ type : "EVENT" }`](https://stately.ai/docs/migration#actorsend-no-longer-accepts-string-types).

## 6.1.1

### Patch Changes

- [#119](https://github.com/tivac/xstate-component-tree/pull/119) [`743433d`](https://github.com/tivac/xstate-component-tree/commit/743433d388d76a6f5e62bbc6d4f69c224cfc676b) Thanks [@tivac](https://github.com/tivac)! - Support multiple invoked items per state

  Previously it would only use the _last_ invocation at each state.

## 6.1.0

### Minor Changes

- [#117](https://github.com/tivac/xstate-component-tree/pull/117) [`0cec0db`](https://github.com/tivac/xstate-component-tree/commit/0cec0db38d3198ba90ebcc5cfeb896af4e3def0e) Thanks [@tivac](https://github.com/tivac)! - Add machine info to each result

  Otherwise root components of parallel sibling child machines can end up not being actually comparable.

  ```diff
  [
      [Object: null prototype] {
  +       machine: "(machine).child-one",
          path: false,
          component: [Function: child],
          props: false,
          children: []
      },
      [Object: null prototype] {
  +       machine: "(machine).child-two",
          path: false,
          component: [Function: child],
          props: false,
          children: []
      }
  ]
  ```

## 6.0.2

### Patch Changes

- [#115](https://github.com/tivac/xstate-component-tree/pull/115) [`51cfe5e`](https://github.com/tivac/xstate-component-tree/commit/51cfe5e145106268a3fa94b4a30ed76a3f48cd30) Thanks [@tivac](https://github.com/tivac)! - Fix an issue where in specific situations child trees would not be built.

  If a child machine has an `invoke` that immediately triggers a no-op event, the `ComponentTree` instance wouldn't actually walk that child machine for components to render. This was due to an interesting interaction between the xstate `.changed` property and when `invoke`s within the statechart are run.

  Now whenever the `ComponentTree` sees a new machine it hasn't walked is running, it will walk it.

## 6.0.1

### Patch Changes

- [`048060a`](https://github.com/tivac/xstate-component-tree/commit/048060ac854ce51a9e7c23353cdc9507106d47e0) Thanks [@tivac](https://github.com/tivac)! - Fix exports config

## 6.0.0

### Major Changes

- [#111](https://github.com/tivac/xstate-component-tree/pull/111) [`a0ec633`](https://github.com/tivac/xstate-component-tree/commit/a0ec633e140ffdf7a03915dfcd72f6cc67a4c050) Thanks [@tivac](https://github.com/tivac)! - Add `.d.ts` files to releases and restructure exports.

  ## Previously

  ```
  import ComponentTree from "xstate-component-tree";
  import componentHelper from "xstate-component-tree/component";
  ```

  ## Now

  ```
  import { ComponentTree, componentHelper } from "xstate-component-tree";
  ```

### Minor Changes

- [#113](https://github.com/tivac/xstate-component-tree/pull/113) [`88d1dba`](https://github.com/tivac/xstate-component-tree/commit/88d1dba0ba899c85bdccbc804348358b8b7eb1dc) Thanks [@tivac](https://github.com/tivac)! - Component helper preserves `.meta` fields

  Previous using the helper like this:

  ```js
  helper(Component, {
    meta: {
      fooga: "wooga",
    },
  });
  ```

  would return an object with no `meta.fooga` property. Now those keys are properly preserved if they exist.

  `meta.load` will **still be overwritten** if it exists, because it is required for the helper to function. A warning if it exists may be introduced in a future release.

## 5.2.0

### Minor Changes

- [#98](https://github.com/tivac/xstate-component-tree/pull/98) [`e7cd20d`](https://github.com/tivac/xstate-component-tree/commit/e7cd20dfc3ec20427bb46fea6b7b49085bc0b5cd) Thanks [@tivac](https://github.com/tivac)! - Support for components at the root of machines

  ```js
  createMachine({
    initial: "foo",

    meta: {
      component: RootComponent,
    },

    states: {
      foo: {
        meta: {
          component: FooComponent,
        },
      },
    },
  });
  ```

  Previously `RootComponent` would be ignored, now it will be the first component in the tree and `FooComponent` will be placed as a child of it.

## 5.1.0

### Minor Changes

- [#74](https://github.com/tivac/xstate-component-tree/pull/74) [`951cea7`](https://github.com/tivac/xstate-component-tree/commit/951cea77d3bdcced2ad6520d4bc6b6e62e7961f7) Thanks [@tivac](https://github.com/tivac)! - Adding `.can()` API from XState

  The `.can()` API is a simple passthrough to the interpreter for the root statechart being managed by `xstate-component-tree`, and is intended as a convenience function to make it easier to interact with a ComponentTree instance instead of a direct XState Interpreter reference.

  From the XState docs on `.can()`:

  > Determines whether sending the event will cause a non-forbidden transition to be selected, even if the transitions have no actions nor change the state value.

## 5.0.1

### Patch Changes

- [#71](https://github.com/tivac/xstate-component-tree/pull/71) [`00dcf48`](https://github.com/tivac/xstate-component-tree/commit/00dcf4899eb7d9d1cde31f02bad3546b346e39aa) Thanks [@tivac](https://github.com/tivac)! - Fix .hasTag & .matches before interpreter is running

## 5.0.0

### Major Changes

- [#69](https://github.com/tivac/xstate-component-tree/pull/69) [`b6c9fc8`](https://github.com/tivac/xstate-component-tree/commit/b6c9fc85c00e25fc068724ce21cebe82a56b7848) Thanks [@tivac](https://github.com/tivac)! - Always provide a valid initial value to subscribers

  Previously if you called the `.subscribe()` method on a `ComponentTree` instance before the statechart had been processed the return value would be `false`. This meant that subscribers would have to add checks to do anything against the returned value, since they couldn't depend on the `.matches`/`.hasTag`/`.broadcast` APIs existing.

  This change fixes that, and ensures that even if the statechart hasn't been walked yet the initial value stored has all the expected APIs, along with a reasonable value for the `tree` property of `[]`. There isn't a great fallback value for `.state` at this time though.

## 4.2.0

### Minor Changes

- [#67](https://github.com/tivac/xstate-component-tree/pull/67) [`a8aa4ac`](https://github.com/tivac/xstate-component-tree/commit/a8aa4acd4f6c6aa1049f5e9307e297f915da40be) Thanks [@tivac](https://github.com/tivac)! - Added `.send()` API

  The `.send()` API is a simple passthrough to the interpreter for the root statechart being managed by `xstate-component-tree`, and is intended as a convenience function to make it easier to interact with a `ComponentTree` instance instead of a direct XState `Interpreter` reference.

  [XState Docs on .send()](https://xstate.js.org/docs/guides/interpretation.html#sending-events)

## 4.1.1

### Patch Changes

- [#65](https://github.com/tivac/xstate-component-tree/pull/65) [`1f93bbc`](https://github.com/tivac/xstate-component-tree/commit/1f93bbcbb9279f696d0480eac8ad00b0dd3280cb) Thanks [@tivac](https://github.com/tivac)! - Fix for handling the case where a child machine has already been destroyed but `xstate-component-tree` hasn't gotten that notice yet.

  Mostly comes up when you have `{ type : "final" }` states in the child machine and an `invoke.onDone` transition in the parent.

## 4.1.0

### Minor Changes

- [#63](https://github.com/tivac/xstate-component-tree/pull/63) [`d9d3820`](https://github.com/tivac/xstate-component-tree/commit/d9d38206146e3fb4f58da0f72985f9a016041df4) Thanks [@tivac](https://github.com/tivac)! - Added observable API

  Available on the `ComponentTree` instance as `.subscribe(callback)`, calls the callback function immediately with the most recent result and then will re-call it each time a build completes.

  Follows the [svelte store contract](https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values-store-contract) which isn't _strictly_ compliant with any official observable APIs but is extremely simple and usable.

  The `callback` passed to `.subscribe(...)` will immediately be called with the most recent result of building the component tree (or `false` if it hasn't finished yet), and then for each complete tree building run after that the `callback` will be called with a single argument. The arg is an `Object` with a `null` prototype and the following properties:

  - `tree`, nested component structures. This is the same as the first argument to the older `new ComponentTree(service, callback)` API.
  - `state`, an [XState `State` instance](https://paka.dev/npm/xstate@4.32.1/api#36a51e9234ff1a4d) representing the most recent state of the root statechart.
  - `matches(<state>)`, [`state.matches()`](https://xstate.js.org/docs/guides/states.html#state-matches-parentstatevalue) but for every statechart instance including any invoked statecharts.
  - `hasTag(<tag>)`, [`state.hasTag()`](https://xstate.js.org/docs/guides/states.html#state-hastag-tag) but for every statechart instance including any invoked statecharts.
  - `broadcast(<event>)`, [`service.send()`](https://xstate.js.org/docs/guides/interpretation.html#sending-events) but for every statechart instance including any invoked statecharts. Prefer using this instead of setting `invoke.autoForward` because it'll reduce the amount of junk events sent to invoked children.

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [4.0.0](https://github.com/tivac/xstate-component-tree/compare/v3.5.0...v4.0.0) (2022-03-16)

### ⚠ BREAKING CHANGES

- previously the second arg to the callback function had a single `data` property on it representing the last `State` object seen by the top-level machine. Now it has `state` (same as data was previously), and some bound APIs for interacting with the statechart: `.hasTag()`, `.broadcast()`, and `.matches()`. These are the same APIs available on the `ComponentTree` instance but made available through the callback args for convenience.

### Features

- make second callback arg useful ([#42](https://github.com/tivac/xstate-component-tree/issues/42)) ([0db0340](https://github.com/tivac/xstate-component-tree/commit/0db03406c8da42fe0d5b43e331d249710a4550f9))

## [3.5.0](https://github.com/tivac/xstate-component-tree/compare/v3.4.2...v3.5.0) (2022-03-15)

### Features

- add .hasTag(), .matches(), and .broadcast() ([#41](https://github.com/tivac/xstate-component-tree/issues/41)) ([108ec3e](https://github.com/tivac/xstate-component-tree/commit/108ec3ee4f59c469c34f57d6265d8781e4c55a0b))

### [3.4.2](https://github.com/tivac/xstate-component-tree/compare/v3.4.1...v3.4.2) (2022-02-20)

### Bug Fixes

- Use `./components` instead of `/components` for package.json subpath export. ([#34](https://github.com/tivac/xstate-component-tree/issues/34)) ([99b0e68](https://github.com/tivac/xstate-component-tree/commit/99b0e68319420013ab03d35c0a8165ced8e1ddac))

### [3.4.1](https://github.com/tivac/xstate-component-tree/compare/v3.4.0...v3.4.1) (2021-11-24)

## [3.4.0](https://github.com/tivac/xstate-component-tree/compare/v3.3.1...v3.4.0) (2021-11-24)

### Features

- Add component helper to xstate-component-tree package ([#29](https://github.com/tivac/xstate-component-tree/issues/29)) ([6e28384](https://github.com/tivac/xstate-component-tree/commit/6e28384f2483465d9b3fdaaf36b7e988ffb2bdb3))

## [3.3.1](https://github.com/tivac/xstate-component-tree/compare/v3.3.0...v3.3.1) (2020-10-03)

### Bug Fixes

- clear dist when building ([068f209](https://github.com/tivac/xstate-component-tree/commit/068f2093f8d37b7dc431f1ffe7341fbeb2e7e773))

# [3.3.0](https://github.com/tivac/xstate-component-tree/compare/v3.2.0...v3.3.0) (2020-10-03)

### Bug Fixes

- prevent zombie children running ([#16](https://github.com/tivac/xstate-component-tree/issues/16)) ([6f49b85](https://github.com/tivac/xstate-component-tree/commit/6f49b8596cc67683b623346487edffde1a850de2))

# [3.2.0](https://github.com/tivac/xstate-component-tree/compare/v3.1.2...v3.2.0) (2020-08-07)

### Features

- add stable option ([#14](https://github.com/tivac/xstate-component-tree/issues/14)) ([e37e1db](https://github.com/tivac/xstate-component-tree/commit/e37e1dbda3ffc05d9d404a6b99aa26c510ecaee9))

## [3.1.2](https://github.com/tivac/xstate-component-tree/compare/v3.1.1...v3.1.2) (2020-08-06)

## [3.1.1](https://github.com/tivac/xstate-component-tree/compare/v3.1.0...v3.1.1) (2020-08-06)

### Bug Fixes

- remove object spread ([#12](https://github.com/tivac/xstate-component-tree/issues/12)) ([3770ca4](https://github.com/tivac/xstate-component-tree/commit/3770ca4dadd63584f98ac379840b359df202a611))

# [3.1.0](https://github.com/tivac/xstate-component-tree/compare/v3.0.0...v3.1.0) (2020-07-21)

### Features

- add path to return objects ([#11](https://github.com/tivac/xstate-component-tree/issues/11)) ([e6f266b](https://github.com/tivac/xstate-component-tree/commit/e6f266b74bbb946ba808fd21ce00a60a48514316))

# [3.0.0](https://github.com/tivac/xstate-component-tree/compare/v2.0.1...v3.0.0) (2020-03-15)

### Features

- caching load methods ([d534245](https://github.com/tivac/xstate-component-tree/commit/d5342456669c854ae0269798f34f1ac6666658e9))

### BREAKING CHANGES

- - Only 1 callback per tree change, no matter if it was the deepest child or the root machine.

* Updated `load()` support so it can take either a `component` or `[ component, props ]` as a return and the overall `load()` as well as either `component` or `props` will be `await`ed.

## [2.0.1](https://github.com/tivac/xstate-component-tree/compare/v2.0.0...v2.0.1) (2019-12-14)

### Bug Fixes

- svelte example 2.0 compat ([4a7f0da](https://github.com/tivac/xstate-component-tree/commit/4a7f0da3978aba9fdea3eb2a4fbd351dffb818e5))

# [2.0.0](https://github.com/tivac/xstate-component-tree/compare/v1.0.0...v2.0.0) (2019-12-13)

### Features

- insert child machine trees into parent tree ([#2](https://github.com/tivac/xstate-component-tree/issues/2)) ([7357d40](https://github.com/tivac/xstate-component-tree/commit/7357d408cd7011f9e9e82aa40ad9922eec818038))

### BREAKING CHANGES

- The output format has changed to no longer have an array of machines at the top-level, instead it is just the top-level components representing active states. Invoked machines are no longer part of the top-level array but now inserted into the tree of components based on the location of the component that invoked them.

# [1.0.0](https://github.com/tivac/xstate-component-tree/compare/v0.1.0...v1.0.0) (2019-10-27)

# [0.1.0](https://github.com/tivac/xstate-component-tree/compare/cc0106fe07f8c7042df3558c50f96349323cb36c...v0.1.0) (2019-10-27)

### Bug Fixes

- invokes removed from output ([cc0106f](https://github.com/tivac/xstate-component-tree/commit/cc0106fe07f8c7042df3558c50f96349323cb36c))

### Features

- add ability to unsub from changes ([5fe766a](https://github.com/tivac/xstate-component-tree/commit/5fe766a0162506936fba3d44fcaad938cb544c36))
- add props support ([0bc1954](https://github.com/tivac/xstate-component-tree/commit/0bc1954239756ffe9948d3b0818bb5709e07aec3))
