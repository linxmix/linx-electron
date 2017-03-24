// const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { assign } = require('lodash')
const assert = require('assert')

const {
  updateZoom
} = require('./actions')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [updateZoom]: (state, action) => {
      const { id } = action.payload
      assert(id, 'Cannot updateZoom without id')

      return {
        ...state,
        zooms: {
          ...state.zooms,
          [id]: assign({}, state.zooms[id], action.payload)
        }
      }
    }
  }, {
    zooms: {}
  })
}
