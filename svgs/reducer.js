const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const d3 = require('d3')

const {
  resetZoom
} = require('./actions')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [resetZoom]: (state, action) => {
      const mixId = action.payload
      const zoom = state.zooms[mixId] || d3.zoom()

      return state
    }
  }, {
    zooms: {}
  })
}
