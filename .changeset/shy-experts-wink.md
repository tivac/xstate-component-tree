---
"xstate-component-tree": patch
---

Fix an issue where in specific situations child trees would not be built.

If a child machine has an `invoke` that immediately triggers a no-op event, the `ComponentTree` instance wouldn't actually walk that child machine for components to render. This was due to an interesting interaction between the xstate `.changed` property and when `invoke`s within the statechart are run.

Now whenever the `ComponentTree` sees a new machine it hasn't walked is running, it will walk it.
