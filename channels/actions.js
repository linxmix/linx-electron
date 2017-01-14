const { createActions } = require('redux-actions')

module.exports = createActions(
  'SET_CHANNELS',
  'UNSET_CHANNELS',
  'UNSET_CHANNEL'
)
