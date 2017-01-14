const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { mapValues, values, omitBy, isNil, includes } = require('lodash')

const { getMetas, getMetasDirty } = require('../metas/getters')
const { getChannels } = require('../channels/getters')
const { getSamplesError } = require('../samples/getters')
const { getClips } = require('../clips/getters')
const nestMix = require('./helpers/nest')
const { getPrimaryTracks } = require('./helpers/get-tracks')

const getMixesRecords = (state) => state.mixes.records
const getMixesIsLoadingList = (state) => state.mixes.isLoadingList
const getMixesSaving = (state) => state.mixes.saving
const getMixesLoading = (state) => state.mixes.loading
const getMixesDirty = (state) => state.mixes.dirty
const getMixesError = (state) => state.mixes.error

const getMixes = Getter(
  getMixesRecords,
  getMetas,
  getChannels,
  getClips,
  getMixesSaving,
  getMixesLoading,
  getMixesDirty,
  getMetasDirty,
  (mixes, metas, channels, clips, saving, loading, dirtyMixes, dirtyMetas) => {
    return omitBy(mapValues(mixes, (flatMix, mixId) => {
      if (channels[flatMix.channelId]) {
        const nestedMix = nestMix({ ...flatMix, channels, clips })
        return {
          ...nestedMix,
          meta: metas[nestedMix.id] || {},
          primaryTracks: getPrimaryTracks(nestedMix, metas),
          isLoading: includes(loading, nestedMix.id),
          isSaving: includes(saving, nestedMix.id),
          isDirty: includes(dirtyMixes, nestedMix.id) || includes(dirtyMetas, nestedMix.id)
        }
      }
    }), isNil)
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
  error: getMixesError
})

module.exports = {
  getMixListProps,
  getMixProps
}
