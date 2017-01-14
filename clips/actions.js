const { createActions } = require('redux-actions')

module.exports = createActions(
  'SET_CLIPS',
  'UNSET_CLIPS',
  'UNSET_CLIP'
)
