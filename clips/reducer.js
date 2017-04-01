const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { map, defaults, without, omit, assign, includes } = require('lodash')
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
  moveClip,
  moveControlPoint,
  createControlPoint,
  deleteControlPoint
} = require('./actions')
const CLIP_TYPES = require('./constants')
const { quantizeBeat, clamp } = require('../lib/number-utils')

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
      assert(includes(CLIP_TYPES, attrs.type), 'Must have valid type to createClip')

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
      const { id, startBeat, diffBeats, quantization } = action.payload

      return loop(state, Effects.constant(updateClip({
        id,
        startBeat: quantizeBeat({ quantization, beat: diffBeats }) + startBeat
      })))
    },
    [moveControlPoint]: (state, action) => {
      const { sourceId, id, beat, value, diffBeats, diffValue,
        quantization, minBeat = 0, maxBeat = 0 } = action.payload

      const sourceClip = state.records[sourceId]
      assert(sourceClip, 'Cannot moveControlPoint for nonexistent sourceClip')

      const newBeat = quantizeBeat({ quantization, beat: diffBeats }) + beat

      return loop(state, Effects.constant(updateClip({
        id: sourceId,
        controlPoints: {
          ...sourceClip.controlPoints,
          [id]: {
            id,
            beat: clamp(minBeat, newBeat, maxBeat),
            value: clamp(0, value - diffValue, 1)
          }
        }
      })))
    },
    [createControlPoint]: (state, action) => {
      const { sourceId, beat, value, minBeat, maxBeat, quantization } = action.payload
      const newControlPoint = {
        id: uuid(),
        beat: clamp(minBeat, quantizeBeat({ quantization, beat }), maxBeat),
        value: clamp(0, value, 1)
      }
      const sourceClip = state.records[sourceId]
      assert(sourceClip, 'Cannot createControlPoint for nonexistent sourceClip')

      return loop(state, Effects.constant(updateClip({
        id: sourceId,
        controlPoints: {
          ...sourceClip.controlPoints,
          [newControlPoint.id]: newControlPoint
        }
      })))
    },
    [deleteControlPoint]: (state, action) => {
      const { id, sourceId } = action.payload
      const sourceClip = state.records[sourceId]
      assert(sourceClip, 'Cannot createControlPoint for nonexistent sourceClip')

      return loop(state, Effects.constant(updateClip({
        id: sourceId,
        controlPoints: omit(sourceClip.controlPoints, id)
      })))
    }
  }, {
    dirty: [],
    records: {}
  })
}
