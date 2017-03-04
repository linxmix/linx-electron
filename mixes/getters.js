const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { mapValues, values, includes } = require('lodash')

const { getPlayStates, getAudioContext } = require('../audio/getters')
const { getMetas } = require('../metas/getters')
const { getChannels } = require('../channels/getters')
const { getSamplesError } = require('../samples/getters')
const { getPrimaryTracks } = require('./helpers/get-tracks')

const getMixesRecords = (state) => state.mixes.records
const getMixesIsLoadingList = (state) => state.mixes.isLoadingList
const getMixesSaving = (state) => state.mixes.saving
const getMixesLoading = (state) => state.mixes.loading
const getMixesDirty = (state) => state.mixes.dirty
const getMixesError = (state) => state.mixes.error

const getMixes = Getter(
  getMixesRecords,
  getPlayStates,
  getMetas,
  getChannels,
  getMixesSaving,
  getMixesLoading,
  getMixesDirty,
  (mixes, playStates, metas, channels, saving, loading, dirtyMixes) => {
    return mapValues(mixes, ({ id, channelId }) => {
      const meta = metas[id] || {}
      const channel = channels[channelId] || {}
      const playState = playStates[channel.id] || {}

      return {
        id,
        channel,
        meta,
        playState,
        tracks: getPrimaryTracks(channel, metas),
        isLoading: includes(loading, id),
        isSaving: includes(saving, id),
        isDirty: includes(dirtyMixes, id) ||
          meta.isDirty ||
          channel.isDirty
      }
    })
  }
)

const getMixList = Getter(
  getMixes,
  (mixes) => values(mixes)
)

const getMixListProps = Struct({
  mixList: getMixList,
  isLoadingList: getMixesIsLoadingList,
  error: getMixesError
})

const getMixProps = Struct({
  mixes: getMixes,
  sampleError: getSamplesError,
  error: getMixesError,
  audioContext: getAudioContext
})

module.exports = {
  getMixListProps,
  getMixProps
}
