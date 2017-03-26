const { combineReducers } = require('redux-loop')
const { routerReducer } = require('react-router-redux')

module.exports = createReducer

function createReducer (config) {
  return combineReducers({
    routing: routerReducer,
    mixes: require('./mixes/reducer')(config),
    samples: require('./samples/reducer')(config),
    channels: require('./channels/reducer')(config),
    clips: require('./clips/reducer')(config),
    metas: require('./metas/reducer')(config),
    audios: require('./audios/reducer')(config),
    svgs: require('./svgs/reducer')(config)
  })
}
