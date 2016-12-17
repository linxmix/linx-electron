const { createActions } = require('redux-actions')

module.exports = createActions(
  'LOAD_MIX_LIST',
  'LOAD_MIX_LIST_SUCCESS',
  'LOAD_MIX_LIST_FAILURE',
  'LOAD_MIX_LIST_END',
  'LOAD_MIX',
  'LOAD_MIX_SUCCESS',
  'LOAD_MIX_FAILURE',
  'LOAD_MIX_END',
  'SET_MIX'
)
