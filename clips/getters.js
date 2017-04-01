const { createSelector: Getter } = require('reselect')
const { map, mapValues, includes, get } = require('lodash')

const { isValidNumber, validNumberOrDefault, timeToBeat } = require('../lib/number-utils')
const { getSamples } = require('../samples/getters')
const { CLIP_TYPE_SAMPLE, CLIP_TYPE_AUTOMATION } = require('../clips/constants')

const getClipsRecords = (state) => state.clips.records
const getClipsDirty = (state) => state.clips.dirty

const DEFAULT_SAMPLE_CLIP_BEAT_COUNT = 100

const getClips = Getter(
  getClipsRecords,
  getClipsDirty,
  getSamples,
  (clips, dirtyClips, samples) => {
    return mapValues(clips, clip => {
      let startBeat, beatCount, sample, status, audioStartTime

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

      } else if (clip.type === CLIP_TYPE_AUTOMATION) {
        const controlPointBeats = map(clip.controlPoints, 'beat')
        startBeat = validNumberOrDefault(Math.min(...controlPointBeats), 0)
        beatCount = validNumberOrDefault(Math.max(...controlPointBeats) - startBeat, 0)
      }

      return {
        ...clip,
        status,
        sample,
        startBeat,
        beatCount,
        audioStartTime,
        isDirty: includes(dirtyClips, clip.id)
      }
    })
  }
)

module.exports = {
  getClips
}
