const { createActions } = require('redux-actions')

module.exports = createActions(
  'SET_CHANNELS',
  'SET_CHANNEL',
  'UNSET_CHANNELS',
  'UNSET_CHANNEL',
  'UNDIRTY_CHANNELS',
  'UNDIRTY_CHANNEL',
  'CREATE_CHANNEL',
  'UPDATE_CHANNEL',
  'SET_CHANNEL_PARENT',
  'CREATE_PRIMARY_TRACK_FROM_FILE'
)
