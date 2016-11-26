const { combineReducers } = require('redux-loop')
const { routerReducer } = require('react-router-redux')

module.exports = createReducer

function createReducer (config) {
  return combineReducers({
    routing: routerReducer,
    mixes: require('./mixes/reducer')(config),
    samples: require('./samples/reducer')(config)
  })
}
