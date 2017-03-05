const { createSelector: Getter } = require('reselect')
const { mapValues, includes, get } = require('lodash')

const { isValidNumber, validNumberOrDefault, timeToBeat } = require('../lib/number-utils')
const { getSamples } = require('../samples/getters')

const getClipsRecords = (state) => state.clips.records
const getClipsDirty = (state) => state.clips.dirty

const DEFAULT_BEAT_COUNT = 100

const getClips = Getter(
  getClipsRecords,
  getClipsDirty,
  getSamples,
  (clips, dirtyClips, samples) => {
    return mapValues(clips, clip => {
      const sample = samples[clip.sampleId] || {}

      // compute status
      let status = 'unloaded'
      if (sample.isLoading) {
        status = 'loading'
      } else if (sample.audioBuffer) {
        status = 'loaded'
      }

      // compute beatCount
      let beatCount = clip.beatCount
      if (!isValidNumber(beatCount)) {
        if (sample.meta) {
          const computedBeatCount = timeToBeat(get(sample, 'meta.duration'), get(sample, 'meta.bpm'))
          beatCount = validNumberOrDefault(computedBeatCount, DEFAULT_BEAT_COUNT)
        }
      }

      // compute audioStartTime
      let audioStartTime = clip.audioStartTime
      if (!isValidNumber(audioStartTime)) {
        audioStartTime = validNumberOrDefault(get(sample, 'meta.barGridTime'), 0)
      }

      return {
        ...clip,
        status,
        sample,
        beatCount,
        audioStartTime,
        startBeat: validNumberOrDefault(clip.startBeat, 0),
        isDirty: includes(dirtyClips, clip.id)
      }
    })
  }
)

module.exports = {
  getClips
}
