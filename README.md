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

## Project Structure

Each concept in the application gets its own `${conceptName}/` directory.

```txt
Directory structure
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
