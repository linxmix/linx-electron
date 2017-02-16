const { createActions } = require('redux-actions')

module.exports = createActions(
  'PLAY',
  'PAUSE',
  'UPDATE_PLAY_STATE',
  'UPDATE_AUDIO_GRAPH',
  'UPDATE_VIRTUAL_AUDIO_GRAPH'
)
