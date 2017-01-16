const { createActions } = require('redux-actions')

module.exports = createActions(
  'SET_CLIPS',
  'SET_CLIP',
  'UNSET_CLIPS',
  'UNSET_CLIP',
  'UNDIRTY_CLIPS',
  'UNDIRTY_CLIP',
  'CREATE_CLIP'
)
