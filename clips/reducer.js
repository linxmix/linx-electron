const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map, defaults, without } = require('lodash')
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
      dirty: without(state.dirty, action.payload.id),
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
        dirty: without(state.dirty, id),
        records: nextRecords
      }
    },
    [createClip]: (state, action) => {
      const attrs = defaults(action.payload, { id: uuid() })
      assert(attrs.sampleId, 'Cannot createClip without sampleId')

      return loop({
        ...state, dirty: [...state.dirty, attrs.id]
      }, Effects.constant(setClip(attrs)))
    }
  }, {
    dirty: [],
    records: {}
  })
}
