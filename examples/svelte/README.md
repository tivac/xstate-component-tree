# `xstate-component-tree` svelte example

## Installation

```bash
> npm install
```

## Running the example

``` bash
> npm start
```

The server will start, and the example app will be available on http://localhost:10001

Clicking on "Navigate" will change the top-level state, showing the components changing.

Clicking on "Next Child" will do the same, but further down the tree. Note that the "RENDERED AT" times don't change for parent components in these cases, they aren't re-rendering at all because they don't need to.