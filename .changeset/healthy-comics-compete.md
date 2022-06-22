---
"xstate-component-tree": patch
---

Fix for handling the case where a child machine has already been destroyed but `xstate-component-tree` hasn't gotten that notice yet.

Mostly comes up when you have `{ type : "final" }` states in the child machine and an `invoke.onDone` transition in the parent.
