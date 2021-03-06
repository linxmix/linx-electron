const { createActions } = require('redux-actions')

module.exports = createActions(
  'SET_CLIPS',
  'SET_CLIP',
  'UNSET_CLIPS',
  'UNSET_CLIP',
  'UNDIRTY_CLIPS',
  'UNDIRTY_CLIP',
  'CREATE_CLIP',
  'UPDATE_CLIP',
  'MOVE_CLIP',
  'SNIP_CLIP',
  'RESIZE_SAMPLE_CLIP',
  'MOVE_CONTROL_POINT',
  'CREATE_CONTROL_POINT',
  'CREATE_CONTROL_POINTS',
  'DELETE_CONTROL_POINT',
  'UPDATE_CONTROL_POINT_VALUE',
  'UPDATE_CONTROL_POINT_POSITION',
  'CREATE_AUTOMATION_CLIP_WITH_CONTROL_POINT',
  'CREATE_SAMPLE_CLIP',
  'CALCULATE_GRID_MARKERS',
  'CLEAR_GRID_MARKERS',
  'SELECT_GRID_MARKER'
)
