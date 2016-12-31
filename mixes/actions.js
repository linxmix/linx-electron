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
  'SAVE_MIX',
  'SAVE_MIX_SUCCESS',
  'SAVE_MIX_FAILURE',
  'SAVE_MIX_END',
  'NAVIGATE_TO_MIX',
  'SET_MIX',
  'CREATE_MIX',
  'CREATE_MIX_END'
)
