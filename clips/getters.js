const { createSelector: Getter } = require('reselect')
const { mapValues, includes } = require('lodash')

const { getSamples } = require('../samples/getters')

const getClipsRecords = (state) => state.clips.records
const getClipsDirty = (state) => state.clips.dirty

const getClips = Getter(
  getClipsRecords,
  getClipsDirty,
  getSamples,
  (clips, dirtyClips, samples) => {
    return mapValues(clips, clip => {
      const sample = samples[clip.sampleId] || {}

      let status = 'unloaded'
      if (sample.isLoading) {
        status = 'loading'
      } else if (sample.audioBuffer) {
        status = 'loaded'
      }

      return {
        ...clip,
        status,
        sample,
        isDirty: includes(dirtyClips, clip.id)
      }
    })
  }
)

module.exports = {
  getClips
}
