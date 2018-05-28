const { createSelector: Getter } = require('reselect')
const { map, mapValues, includes, get, sortBy, values } = require('lodash')

const { isValidNumber, validNumberOrDefault, timeToBeat } = require('../lib/number-utils')
const { getSamples } = require('../samples/getters')
const {
  CLIP_TYPE_SAMPLE,
  CLIP_TYPE_AUTOMATION,
  CLIP_TYPE_TEMPO,
} = require('./constants')
const getControlPointsValueScale = require('./helpers/get-control-points-value-scale')

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
        if (audioStartTime < 0) {
          audioStartTime = 0
          console.warn('Cannot have clip with audioStartTime < 0')
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
        beatCount = Math.max(0, beatCount)

        // compute startBeat
        startBeat = validNumberOrDefault(clip.startBeat, 0)

        // sort gridMarkers
        gridMarkers = sortBy(clip.gridMarkers || [], 'beat')

      } else if (clip.type === CLIP_TYPE_AUTOMATION || clip.type === CLIP_TYPE_TEMPO) {
        const controlPointsValueScale = getControlPointsValueScale(clip.controlType)
        controlPoints = map(values(clip.controlPoints), controlPoint => ({
          ...controlPoint,
          clip,
          scaledValue: controlPointsValueScale(controlPoint.value),
          valueScale: controlPointsValueScale
        }))
        controlPoints = sortBy(controlPoints, 'beat', 'value')
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
        isDirty: includes(dirtyClips, clip.id),
        isAutomationClip: clip.type === CLIP_TYPE_AUTOMATION,
        isSampleClip: clip.type === CLIP_TYPE_SAMPLE,
      }
    })
  }
)

module.exports = {
  getClips
}
