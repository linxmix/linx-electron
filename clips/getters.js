const { createSelector: Getter } = require('reselect')
const { mapValues, includes } = require('lodash')

const getClipsRecords = (state) => state.clips.records
const getClipsDirty = (state) => state.clips.dirty

const getClips = Getter(
  getClipsRecords,
  getClipsDirty,
  (clips, dirtyClips) => {
    return mapValues(clips, clip => {
      return {
        ...clip,
        isDirty: includes(dirtyClips, clip.id)
      }
    })
  }
)

module.exports = {
  getClips
}
