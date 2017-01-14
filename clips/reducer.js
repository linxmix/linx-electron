const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map } = require('lodash')

const {
  setClips,
  unsetClips,
  unsetClip
} = require('./actions')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [setClips]: (state, action) => {
      const { records } = state
      const { payload: clips } = action
      return { ...state, records: { ...records, ...clips } }
    },
    [unsetClips]: (state, action) => loop(state, Effects.batch(
      map(action.payload, clip => Effects.constant(unsetClip(clip))))),
    [unsetClip]: (state, action) => {
      const { id } = action.payload

      const nextRecords = state.records
      delete nextRecords[id]

      return {
        ...state,
        records: nextRecords
      }
    }
  }, {
    records: {}
  })
}
