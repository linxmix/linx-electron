const { createActions } = require('redux-actions')

module.exports = createActions(
  'LOAD_META_LIST',
  'LOAD_META_LIST_SUCCESS',
  'LOAD_META_LIST_FAILURE',
  'LOAD_META_LIST_END',
  'LOAD_META',
  'LOAD_META_SUCCESS',
  'LOAD_META_FAILURE',
  'LOAD_META_END',
  'SAVE_META',
  'SAVE_META_SUCCESS',
  'SAVE_META_FAILURE',
  'SAVE_META_END',
  'CREATE_META'
)
