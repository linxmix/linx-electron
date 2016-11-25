const { createActions } = require('redux-actions')

module.exports = createActions(
  'LOAD_SAMPLE_LIST',
  'LOAD_SAMPLE_LIST_SUCCESS',
  'LOAD_SAMPLE_LIST_FAILURE',
  'LOAD_SAMPLE_LIST_END',
  'LOAD_SAMPLE',
  'LOAD_SAMPLE_SUCCESS',
  'LOAD_SAMPLE_FAILURE',
  'LOAD_SAMPLE_END'
)
