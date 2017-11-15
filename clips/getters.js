const { createSelector: Getter } = require('reselect')
const { map, mapValues, includes, get, sortBy, values } = require('lodash')
const d3 = require('d3')

const { isValidNumber, validNumberOrDefault, timeToBeat } = require('../lib/number-utils')
const { getSamples } = require('../samples/getters')
const {
  CLIP_TYPE_SAMPLE,
  CLIP_TYPE_AUTOMATION,
  CLIP_TYPE_TEMPO,
  CONTROL_TYPE_GAIN,
  CONTROL_TYPE_LOW_BAND,
  CONTROL_TYPE_MID_BAND,
  CONTROL_TYPE_HIGH_BAND,
  CONTROL_TYPE_FILTER_HIGHPASS_CUTOFF,
  CONTROL_TYPE_FILTER_HIGHPASS_Q,
  CONTROL_TYPE_FILTER_LOWPASS_CUTOFF,
  CONTROL_TYPE_FILTER_LOWPASS_Q,
  CONTROL_TYPE_DELAY_CUTOFF
} = require('../clips/constants')

const getClipsRecords = (state) => state.clips.records
const getClipsDirty = (state) => state.clips.dirty

const DEFAULT_SAMPLE_CLIP_BEAT_COUNT = 100

const getClips = Getter(
  getClipsRecords,
  getClipsDirty,
  getSamples,
  (clips, dirtyClips, samples) => {
    return mapValues(clips, clip => {
      let startBeat, beatCount, sample, status, audioStartTime, controlPoints, gridMarkers

      if (clip.type === CLIP_TYPE_SAMPLE) {
        sample = samples[clip.sampleId] || {}

        // compute status
        if (sample.isLoading) {
          status = 'loading'
        } else if (!sample.audioBuffer) {
          status = 'unloaded'
        } else {
          status = 'loaded'
        }

        // compute audioStartTime
        audioStartTime = clip.audioStartTime
        if (!isValidNumber(audioStartTime)) {
          audioStartTime = validNumberOrDefault(get(sample, 'meta.barGridTime'), 0)
        }

        // compute beatCount
        beatCount = clip.beatCount
        if (!isValidNumber(beatCount)) {
          if (sample.meta) {
            const computedBeatCount = timeToBeat(get(sample, 'meta.duration') - audioStartTime,
              get(sample, 'meta.bpm'))
            beatCount = validNumberOrDefault(computedBeatCount, DEFAULT_SAMPLE_CLIP_BEAT_COUNT)
          }
        }

        // compute startBeat
        startBeat = validNumberOrDefault(clip.startBeat, 0)

        // sort gridMarkers
        gridMarkers = sortBy(clip.gridMarkers || [], 'beat')

      } else if (clip.type === CLIP_TYPE_AUTOMATION) {
        const controlPointsValueScale = _getControlPointsValueScale(clip.controlType)
        controlPoints = map(values(clip.controlPoints), controlPoint => ({
          ...controlPoint,
          scaledValue: controlPointsValueScale(controlPoint.value)
        }))
        controlPoints = sortBy(controlPoints, 'beat', 'value')
        startBeat = validNumberOrDefault(Math.min(...map(controlPoints, 'beat')), 0)
        beatCount = validNumberOrDefault(Math.max(...map(controlPoints, 'beat')) - startBeat, 0)
        
      } else if (clip.type === CLIP_TYPE_TEMPO) {
        controlPoints = sortBy(values(clip.controlPoints), 'beat', 'value')
        startBeat = validNumberOrDefault(Math.min(...map(controlPoints, 'beat')), 0)
        beatCount = validNumberOrDefault(Math.max(...map(controlPoints, 'beat')) - startBeat, 0)
      }

      return {
        ...clip,
        status,
        sample,
        startBeat,
        beatCount,
        audioStartTime,
        controlPoints,
        gridMarkers,
        isDirty: includes(dirtyClips, clip.id)
      }
    })
  }
)

module.exports = {
  getClips
}

function _getControlPointsValueScale(controlType) {
  switch(controlType) {
    case CONTROL_TYPE_LOW_BAND:
    case CONTROL_TYPE_MID_BAND:
    case CONTROL_TYPE_HIGH_BAND:
      return d3.scaleLinear().domain([0, 1]).range([-40, 40])
    case CONTROL_TYPE_FILTER_HIGHPASS_Q:
    case CONTROL_TYPE_FILTER_LOWPASS_Q:
      return d3.scaleLinear().domain([0, 1]).range([0.001, 30])
    case CONTROL_TYPE_FILTER_HIGHPASS_CUTOFF:
    case CONTROL_TYPE_FILTER_LOWPASS_CUTOFF:
    case CONTROL_TYPE_DELAY_CUTOFF:
      return d3.scalePow().exponent(2.5).domain([0, 1]).range([10, 22050])
    default:
      return d3.scaleIdentity()
  }
}
