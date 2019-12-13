# [2.0.0](https://github.com/tivac/xstate-component-tree/compare/v1.0.0...v2.0.0) (2019-12-13)


### Features

* insert child machine trees into parent tree ([#2](https://github.com/tivac/xstate-component-tree/issues/2)) ([7357d40](https://github.com/tivac/xstate-component-tree/commit/7357d408cd7011f9e9e82aa40ad9922eec818038))


### BREAKING CHANGES

* The output format has changed to no longer have an array of machines at the top-level, instead it is just the top-level components representing active states. Invoked machines are no longer part of the top-level array but now inserted into the tree of components based on the location of the component that invoked them.



# [1.0.0](https://github.com/tivac/xstate-component-tree/compare/v0.1.0...v1.0.0) (2019-10-27)



# [0.1.0](https://github.com/tivac/xstate-component-tree/compare/cc0106fe07f8c7042df3558c50f96349323cb36c...v0.1.0) (2019-10-27)


### Bug Fixes

* invokes removed from output ([cc0106f](https://github.com/tivac/xstate-component-tree/commit/cc0106fe07f8c7042df3558c50f96349323cb36c))


### Features

* add ability to unsub from changes ([5fe766a](https://github.com/tivac/xstate-component-tree/commit/5fe766a0162506936fba3d44fcaad938cb544c36))
* add props support ([0bc1954](https://github.com/tivac/xstate-component-tree/commit/0bc1954239756ffe9948d3b0818bb5709e07aec3))



