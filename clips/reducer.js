const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map } = require('lodash')
const assert = require('assert')
const uuid = require('uuid/v4')

const {
  setClips,
  setClip,
  unsetClips,
  unsetClip,
  createClip
} = require('./actions')

module.exports = createReducer

function createReducer (config) {
  return handleActions({
    [setClips]: (state, action) => loop(state, Effects.batch(
      map(action.payload, clip => Effects.constant(setClip(clip))))),
    [setClip]: (state, action) => ({
      ...state,
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
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
    },
    [createClip]: (state, action) => {
      const {
        sampleId
      } = action.payload

      assert(sampleId, 'Cannot createClip without sampleId')

      const newClip = {
        id: uuid(),
        sampleId
      }

      return loop(state, Effects.constant(setClip(newClip)))
    }
  }, {
    records: {}
  })
}
