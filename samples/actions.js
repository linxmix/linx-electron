const { createActions } = require('redux-actions')

module.exports = createActions(
  'LOAD_SAMPLE_LIST',
  'LOAD_SAMPLE_LIST_SUCCESS',
  'LOAD_SAMPLE_LIST_FAILURE',
  'LOAD_SAMPLE_LIST_END',
  'LOAD_SAMPLE',
  'LOAD_SAMPLE_SUCCESS',
  'LOAD_SAMPLE_FAILURE',
  'LOAD_SAMPLE_END',
  'LOAD_REVERB_SAMPLE_LIST',
  'LOAD_REVERB_SAMPLE_LIST_SUCCESS',
  'LOAD_REVERB_SAMPLE_LIST_FAILURE',
  'LOAD_REVERB_SAMPLE_LIST_END',
  'CREATE_SAMPLE',
  'CREATE_SAMPLE_SUCCESS',
  'CREATE_SAMPLE_DUPLICATE',
  'CREATE_SAMPLE_FAILURE',
  'CREATE_SAMPLE_END',
  'ANALYZE_SAMPLE',
  'ANALYZE_SAMPLE_SUCCESS',
  'ANALYZE_SAMPLE_FAILURE',
  'ANALYZE_SAMPLE_END'
)
