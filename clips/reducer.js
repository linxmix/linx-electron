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
  snipClip,
  resizeSampleClip,
  moveControlPoint,
  createControlPoint,
  deleteControlPoint,
  updateControlPointValue,
  updateControlPointPosition,
  createAutomationClipWithControlPoint,
  createSampleClip,
  calculateGridMarkers,
  clearGridMarkers,
  selectGridMarker
} = require('./actions')
const { setClipsChannel } = require('../channels/actions')
const { updateMeta } = require('../metas/actions')
const { analyzeSample } = require('../samples/actions')
const { CLIP_TYPES, CONTROL_TYPES, CLIP_TYPE_AUTOMATION,
  CLIP_TYPE_TEMPO, CLIP_TYPE_SAMPLE } = require('./constants')
const { quantizeBeat, clamp, beatToTime, timeToBeat, validNumberOrDefault,
  bpmToSpb, isValidNumber, getFirstBarOffsetTime } = require('../lib/number-utils')

const DEFAULT_TEMPO = 128

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
      map(action.payload, id => Effects.constant(unsetClip({ id }))))),
    [unsetClip]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload.id),
      records: omit(state.records, action.payload.id)
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
        ...state,
        dirty: [...state.dirty, attrs.id],
        records: {
          ...state.records,
          [attrs.id]: attrs
        }
      }, Effects.none())
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
    [snipClip]: (state, action) => {
      const { channel, clip, snipAtBeat, quantization } = action.payload

      const trackGroup = channel.parentChannel
      const mixChannel = trackGroup.parentChannel
      const quantizedSnipAtBeat = quantizeBeat({
        quantization,
        beat: snipAtBeat,
        offset: mixChannel.startBeat + trackGroup.startBeat + channel.startBeat + clip.startBeat
      })
      const newClipId = uuid()
      const audioBpm = clip.sample.meta.bpm

      if (quantizedSnipAtBeat <= 0 || quantizedSnipAtBeat >= clip.beatCount) {
        return state
      }

      return loop(state, Effects.batch([
        Effects.constant(updateClip({
          id: clip.id,
          beatCount: quantizedSnipAtBeat
        })),
        Effects.constant(createClip({
          id: newClipId,
          type: CLIP_TYPE_SAMPLE,
          sampleId: clip.sampleId,
          audioStartTime: beatToTime(
            timeToBeat(clip.audioStartTime, audioBpm) + quantizedSnipAtBeat, audioBpm
          ),
          beatCount: clip.beatCount - quantizedSnipAtBeat,
          startBeat: clip.startBeat + quantizedSnipAtBeat
        })),
        Effects.constant(setClipsChannel({
          channelId: channel.id,
          clipIds: [newClipId]
        })),
      ]))
    },
    [resizeSampleClip]: (state, action) => {
      const { id, startBeat, beatCount, isResizeLeft, quantization,
        audioStartTime, audioBpm, minStartBeat, maxBeatCount } = action.payload
      let { diffBeats } = action.payload
      let quantizedDiffBeats = quantizeBeat({ quantization, beat: diffBeats })

      let updatePayload
      if (isResizeLeft) {

        // if resizing beyond audio start,
        // clamp to smallest positive quantized beat
        let newStartBeat = startBeat + quantizedDiffBeats
        if (newStartBeat < minStartBeat) {
          if (quantization === 'bar' || quantization === 'beat') {
            while ((newStartBeat = startBeat + quantizedDiffBeats) < minStartBeat) {
              diffBeats += 1
              quantizedDiffBeats = quantizeBeat({ quantization, beat: diffBeats })
            }
          } else {
            newStartBeat = minStartBeat
          }
        }

        updatePayload = {
          id,
          startBeat: newStartBeat,
          audioStartTime: audioStartTime + beatToTime(newStartBeat - startBeat, audioBpm),
          beatCount: beatCount - (newStartBeat - startBeat)
        }
      } else {
        updatePayload = {
          id,
          beatCount: Math.min(beatCount + quantizedDiffBeats, maxBeatCount)
        }
      }

      if (updatePayload.beatCount < 0) {
        return state
      } else {
        return loop(state, Effects.constant(updateClip(updatePayload)))
      }
    },
    [moveControlPoint]: (state, action) => {
      const { sourceId, id, beat, value, diffBeats, diffValue,
        quantization, minBeat, maxBeat } = action.payload

      const sourceClip = state.records[sourceId]
      assert(sourceClip, 'Cannot moveControlPoint for nonexistent sourceClip')

      const controlPoint = sourceClip.controlPoints[id]
      assert(controlPoint, 'Cannot moveControlPoint for nonexistent controlPoint')

      const newBeat = quantizeBeat({ quantization, beat: diffBeats }) + beat
      const updatedControlPoint = {
        ...controlPoint,
        beat: newBeat,
      }
      
      if (isValidNumber(diffValue) && isValidNumber(value)) {
        updatedControlPoint.value = clamp(0, value - diffValue, 1)
      }

      return loop(state, Effects.constant(updateClip({
        id: sourceId,
        controlPoints: {
          ...sourceClip.controlPoints,
          [id]: updatedControlPoint
        }
      })))
    },
    [updateControlPointValue]: (state, action) => {
      const { sourceId, id, value } = action.payload
      assert(isValidNumber(value), 'Cannot updateControlPointValue for invalid value')

      const sourceClip = state.records[sourceId]
      assert(sourceClip, 'Cannot updateControlPointValue for nonexistent sourceClip')

      const controlPoint = sourceClip.controlPoints[id]
      assert(controlPoint, 'Cannot updateControlPointValue for nonexistent controlPoint')

      return loop(state, Effects.constant(updateClip({
        id: sourceId,
        controlPoints: {
          ...sourceClip.controlPoints,
          [id]: {
            ...controlPoint,
            value
          }
        }
      })))
    },
    [updateControlPointPosition]: (state, action) => {
      const { sourceId, id, beat } = action.payload
      assert(isValidNumber(beat), 'Cannot updateControlPointBeat for invalid beat')

      const sourceClip = state.records[sourceId]
      assert(sourceClip, 'Cannot updateControlPointValue for nonexistent sourceClip')

      const controlPoint = sourceClip.controlPoints[id]
      assert(controlPoint, 'Cannot updateControlPointValue for nonexistent controlPoint')

      return loop(state, Effects.constant(updateClip({
        id: sourceId,
        controlPoints: {
          ...sourceClip.controlPoints,
          [id]: {
            ...controlPoint,
            beat
          }
        }
      })))
    },
    [createControlPoint]: (state, action) => {
      const { sourceId, beat, value, minBeat, maxBeat, quantization } = action.payload

      const sourceClip = state.records[sourceId]
      assert(sourceClip, 'Cannot createControlPoint for nonexistent sourceClip')

      const newValue = (sourceClip.type === CLIP_TYPE_TEMPO) ?
        validNumberOrDefault(value, DEFAULT_TEMPO) :
        clamp(0, value, 1)

      const newControlPoint = {
        id: uuid(),
        beat: quantizeBeat({ quantization, beat }),
        value: newValue
      }

      const sourceClipControlPoints = get(sourceClip, 'controlPoints') || {}

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
      const { channelId, controlType, beat, value, minBeat, maxBeat, quantization } = action.payload
      assert(channelId, 'Cannot createAutomationClipWithControlPoint without channelId')
      assert(includes(CONTROL_TYPES, controlType),
        'Must have valid controlType to createAutomationClipWithControlPoint')

      const automationClipId = uuid()

      return loop(state, Effects.batch([
        Effects.constant(createClip({
          id: automationClipId,
          type: CLIP_TYPE_AUTOMATION,
          controlType
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
    [createSampleClip]: (state, action) => {
      const { channelId, sampleId, beat, clipOptions, quantization, sourceClipStartBeat } = action.payload
      const clipId = uuid()

      assert(channelId && sampleId, 'Must have valid channelId and sampleId to createSampleClip')

      const delta = validNumberOrDefault(sourceClipStartBeat - quantizeBeat({
        beat: sourceClipStartBeat,
        quantization
      }), 0)

      return loop(state, Effects.batch([
        Effects.constant(createClip(assign({
          sampleId,
          id: clipId,
          type: CLIP_TYPE_SAMPLE,
          startBeat: quantizeBeat({
            quantization,
            beat,
          }) + delta
        }, clipOptions))),
        Effects.constant(setClipsChannel({
          channelId: channelId,
          clipIds: [clipId]
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
            clickWidth: 10,
            beat: timeToBeat(peak.time, bpm),
            time: peak.time
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
    },
    [selectGridMarker]: (state, action) => {
      const { clip, marker } = action.payload
      const audioBpm = get(clip, 'sample.meta.bpm')

      const previousAudioStartTime = get(clip, 'audioStartTime')

      // this may have existing incorrect data, so recalculate to be sure
      const previousOffsetTime = getFirstBarOffsetTime({
        time: get(clip, 'sample.meta.barGridTime'),
        bpm: audioBpm
      })

      const firstBarOffsetTime = getFirstBarOffsetTime({
        time: get(marker, 'time'),
        bpm: audioBpm
      })

      return loop(state, Effects.batch([
        Effects.constant(updateMeta({
          id: get(clip, 'sample.id'),
          barGridTime: firstBarOffsetTime
        })),
        Effects.constant(updateClip({
          id: get(clip, 'id'),
          audioStartTime: previousAudioStartTime +
            (firstBarOffsetTime - previousOffsetTime)
        }))
      ]))
    }
  }, {
    dirty: [],
    records: {}
  })
}
