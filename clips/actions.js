const { createActions } = require('redux-actions')

module.exports = createActions(
  'SET_CLIPS',
  'SET_CLIP',
  'UNSET_CLIPS',
  'UNSET_CLIP',
  'CREATE_CLIP'
)
