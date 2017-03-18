const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map, defaults, without, omit, assign } = require('lodash')
const assert = require('assert')
const uuid = require('uuid/v4')

const {
  setClips,
  setClip,
  unsetClips,
  unsetClip,
  undirtyClips,
  undirtyClip,
  updateClip,
  createClip,
  moveClip
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
      map(action.payload, id => Effects.constant(unsetClip(id))))),
    [unsetClip]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload),
      records: omit(state.records, action.payload)
    }),
    [undirtyClips]: (state, action) => loop(state, Effects.batch(
      map(action.payload, id => Effects.constant(undirtyClip(id))))),
    [undirtyClip]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload)
    }),
    [createClip]: (state, action) => {
      const attrs = defaults({}, action.payload, { id: uuid() })
      assert(attrs.sampleId, 'Cannot createClip without sampleId')

      return loop({
        ...state, dirty: [...state.dirty, attrs.id]
      }, Effects.constant(setClip(attrs)))
    },
    [updateClip]: (state, action) => {
      const { id } = action.payload
      assert(id, 'Cannot updateClip without id')

      return {
        ...state,
        dirty: [...state.dirty, id],
        records: {
          ...state.records,
          [id]: assign({}, state.records[id], action.payload)
        }
      }
    },
    [moveClip]: (state, action) => {
      const { id, beats } = action.payload

      return loop(state, Effects.constant(updateClip({
        id,
        startBeat: beats + state.records[id].startBeat
      })))
    },
  }, {
    dirty: [],
    records: {}
  })
}
