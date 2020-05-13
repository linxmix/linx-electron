const { Cmd, loop } = require('redux-loop')
const { handleActions } = require('redux-actions')
const { assign, defaults, get, includes, map, omit, reduce, without } = require('lodash')
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
    [setClips]: (state, action) => {
      const records = reduce(action.payload, (records, clip) => {
        records[clip.id] = clip
        return records
      }, { ...state.records })

      return {
        ...state,
        records,
        dirty: without(state.dirty, ...map(action.payload, 'id')),
      }
    },
    [setClip]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload.id),
      records: {
        ...state.records,
        [action.payload.id]: action.payload
      }
    }),
    [unsetClips]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, ...action.payload),
      records: omit(state.records, action.payload)
    }),
    [unsetClip]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, action.payload.id),
      records: omit(state.records, action.payload.id)
    }),
    [undirtyClips]: (state, action) => ({
      ...state,
      dirty: without(state.dirty, ...action.payload)
    }),
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
      }, Cmd.none)
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

      return loop(state, Cmd.action(updateClip({
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

      return loop(state, Cmd.batch([
        Cmd.action(updateClip({
          id: clip.id,
          beatCount: quantizedSnipAtBeat
        })),
        Cmd.action(createClip({
          id: newClipId,
          type: CLIP_TYPE_SAMPLE,
          sampleId: clip.sampleId,
          audioStartTime: beatToTime(
            timeToBeat(clip.audioStartTime, audioBpm) + quantizedSnipAtBeat, audioBpm
          ),
          beatCount: clip.beatCount - quantizedSnipAtBeat,
          startBeat: clip.startBeat + quantizedSnipAtBeat
        })),
        Cmd.action(setClipsChannel({
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
        return loop(state, Cmd.action(updateClip(updatePayload)))
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

      return loop(state, Cmd.action(updateClip({
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

      return loop(state, Cmd.action(updateClip({
        id: sourceId,
        controlPoints: {
          ...sourceClip.controlPoints,
          [id]: {
            ...controlPoint,
            value: (sourceClip.type === CLIP_TYPE_TEMPO) ? value : clamp(0, value, 1)
          }
        }
      })))
    },
    [updateControlPointPosition]: (state, action) => {
      const { sourceId, id, beat } = action.payload
      assert(isValidNumber(beat), 'Cannot updateControlPointPosition for invalid beat')

      const sourceClip = state.records[sourceId]
      assert(sourceClip, 'Cannot updateControlPointPosition for nonexistent sourceClip')

      const controlPoint = sourceClip.controlPoints[id]
      assert(controlPoint, 'Cannot updateControlPointPosition for nonexistent controlPoint')

      return loop(state, Cmd.action(updateClip({
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
      const { sourceId, beat, value, quantization = 'sample' } = action.payload

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

      return loop(state, Cmd.action(updateClip({
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

      return loop(state, Cmd.action(updateClip({
        id: sourceId,
        controlPoints: omit(sourceClip.controlPoints, id)
      })))
    },

    [createAutomationClipWithControlPoint]: (state, action) => {
      const { channelId, controlType, beat, value, minBeat, maxBeat, quantization, controlPointArgs = [] } = action.payload
      assert(channelId, 'Cannot createAutomationClipWithControlPoint without channelId')
      assert(includes(CONTROL_TYPES, controlType),
        'Must have valid controlType to createAutomationClipWithControlPoint')

      const automationClipId = uuid()

      let controlPointEffects = []

      // NOTE: this takes a single point or for multiple points 
      // this was done as a shortcut to save time on renaming
      if (controlPointArgs.length) {
        controlPointEffects = controlPointArgs.map(({
          beat, value
        }) => Cmd.action(createControlPoint({
          sourceId: automationClipId,
          beat, value, quantization
        })))
      } else {
        controlPointEffects = [
          Cmd.action(createControlPoint({
            sourceId: automationClipId,
            beat, value, quantization
          }))
        ]
      }

      const effects = [
        Cmd.action(createClip({
          id: automationClipId,
          type: CLIP_TYPE_AUTOMATION,
          controlType
        })),
        Cmd.action(setClipsChannel({
          channelId,
          clipIds: [automationClipId]
        })),
      ].concat(controlPointEffects)

      return loop(state, Cmd.batch(effects))
    },
    [createSampleClip]: (state, action) => {
      const { channelId, sampleId, beat, clipOptions, quantization, sourceClipStartBeat } = action.payload
      const clipId = uuid()

      assert(channelId && sampleId, 'Must have valid channelId and sampleId to createSampleClip')

      const delta = validNumberOrDefault(sourceClipStartBeat - quantizeBeat({
        beat: sourceClipStartBeat,
        quantization
      }), 0)

      return loop(state, Cmd.batch([
        Cmd.action(createClip(assign({
          sampleId,
          id: clipId,
          type: CLIP_TYPE_SAMPLE,
          startBeat: quantizeBeat({
            quantization,
            beat,
          }) + delta
        }, clipOptions))),
        Cmd.action(setClipsChannel({
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

        return Cmd.action(updateClip({
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

      return loop(state, Cmd.action(analyzeSample({
        id: sampleId,
        startTime,
        endTime,
        effectCreator
      })))
    },
    [clearGridMarkers]: (state, action) => {
      const { id } = action.payload
      assert(id, 'Cannot clearGridMarkers without id')

      return loop(state, Cmd.action(updateClip({
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

      return loop(state, Cmd.batch([
        Cmd.action(updateMeta({
          id: get(clip, 'sample.id'),
          barGridTime: firstBarOffsetTime
        })),
        Cmd.action(updateClip({
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
