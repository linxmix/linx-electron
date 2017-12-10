const { createActions } = require('redux-actions')

module.exports = createActions(
  'PLAY',
  'PAUSE',
  'PLAY_PAUSE',
  'SEEK_TO_BEAT',
  'TOGGLE_SOLO_CHANNEL',
  'UPDATE_PLAY_STATE',
  'UPDATE_AUDIO_GRAPH',
  'UPDATE_PLAY_STATE_FOR_TEMPO_CHANGE',
  'START_RECORDING',
  'STOP_RECORDING',
  'EXPORT_WAV',
  'EXPORT_WAV_SUCCESS',
  'EXPORT_WAV_FAILURE'
)
