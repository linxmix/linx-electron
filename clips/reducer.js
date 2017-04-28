const { Effects, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { get, map, defaults, without, omit, assign, includes } = require('lodash')
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
  deleteControlPoint,
  createAutomationClipWithControlPoint,
  calculateGridMarkers,
  clearGridMarkers
} = require('./actions')
const { setClipsChannel } = require('../channels/actions')
const { analyzeSample } = require('../samples/actions')
const { CLIP_TYPES, CONTROL_TYPES,
  CLIP_TYPE_AUTOMATION, CONTROL_TYPE_GAIN } = require('./constants')
const { quantizeBeat, clamp, beatToTime } = require('../lib/number-utils')

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
      if (attrs.type === CLIP_TYPE_AUTOMATION) {
        assert(includes(CONTROL_TYPES, attrs.controlType),
          'Must have valid controlType to createClip of type automation')
      }

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
      const sourceClipControlPoints = get(state, `records[${sourceId}].controlPoints`) || {}

      return loop(state, Effects.constant(updateClip({
        id: sourceId,
        controlPoints: {
          ...sourceClipControlPoints,
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
    },
    [createAutomationClipWithControlPoint]: (state, action) => {
      const { channelId, beat, value, minBeat, maxBeat, quantization } = action.payload
      assert(channelId, 'Cannot createAutomationClipWithControlPoint without channelId')

      const automationClipId = uuid()

      return loop(state, Effects.batch([
        Effects.constant(createClip({
          id: automationClipId,
          type: CLIP_TYPE_AUTOMATION,
          controlType: CONTROL_TYPE_GAIN // TODO: make this variable
        })),
        Effects.constant(setClipsChannel({
          channelId,
          clipIds: [automationClipId]
        })),
        Effects.constant(createControlPoint({
          sourceId: automationClipId,
          beat, value, minBeat, maxBeat, quantization
        }))
      ]))
    },
    [calculateGridMarkers]: (state, action) => {
      const { id, bpm, startTime, endTime } = action.payload
      const clip = state.records[id]
      const { sampleId } = clip
      assert(id && sampleId, 'Cannot calculateGridMarkers without id and sampleId')

      const effectCreator = ({ attrs }) => {
        const { peaks = [] } = attrs

        return Effects.constant(updateClip({
          id,
          gridMarkers: map(peaks, peak => ({
            id: uuid(),
            stroke: 'blue',
            strokeWidth: 1,
            clickWidth: 5,
            beat: beatToTime(peak.time, bpm)
          }))
        }))
      }

      return loop(state, Effects.constant(analyzeSample({
        id: sampleId,
        startTime,
        endTime,
        effectCreator
      })))
    },
    [clearGridMarkers]: (state, action) => {
      const { id } = action.payload
      assert(id, 'Cannot clearGridMarkers without id')

      return loop(state, Effects.constant(updateClip({
        id,
        gridMarkers: []
      })))
    }
  }, {
    dirty: [],
    records: {}
  })
}
