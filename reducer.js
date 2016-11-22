const { combineReducers } = require('redux-loop')

module.exports = combineReducers({
  mixes: require('./mixes/reducer')
}) 
