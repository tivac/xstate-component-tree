---
"xstate-component-tree": major
---

Add `.d.ts` files to releases and restructure exports.

## Previously

```
import ComponentTree from "xstate-component-tree";
import componentHelper from "xstate-component-tree/component";
```

## Now

```
import { ComponentTree, componentHelper } from "xstate-component-tree";
```
