# linx

## Usage

### Installation

```
git clone git@github.com:linxmix/linx-electron
cd linx-electron
npm install
```

### Run

To run in development with live reloading:

```shell
npm run start:dev
```

To run normally,

```shell
npm start
```

### Test

To run all the tests:

```shell
npm test
```

To run all the unit tests:

```shell
npm run test:unit
```

To run a specific unit test:

```shell
npm run test:unit -- ./samples/helpers/flatten.test.js
```

To run the [standard style](http://standardjs.com) linter on all files:

```shell
npm run test:lint
```

To run the [standard style](http://standardjs.com) linter on a specific file:

```shell
npm run test:lint -- ./samples/helpers/flatten.js
```

## Project Structure

Each concept in the application gets its own `${conceptName}/` directory.

```txt
Directory structure
  *.test.js       unit tests (co-located next to file being tested)
  lib/*           generalized modules, should be moved out of project later
  ${concept}/     application concepts
  main.js         electron entry file
  index.js        application js entry file
  index.html      application html entry file
  config.js       application config file
  routes.js       React-Router top-level routes
  reducer.js      Redux top-level reducer

Concept structure
  routes.js       React-Router routes
  containers/*.js React components that provide data to children
  components/*.js React components that present data
  actions.js      Redux action creators
  reducer.js      Redux reducer
  service.js      service methods
  getters.js      data selectors
```
