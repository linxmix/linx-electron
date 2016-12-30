const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { mapValues, values } = require('lodash')

const { getMetas } = require('../metas/getters')
const { getChannels } = require('../channels/getters')
const { getClips } = require('../clips/getters')
const nestMix = require('./helpers/nest')
const { getPrimaryTracks } = require('./helpers/get-tracks')

const getMixesRecords = (state) => state.mixes.records
const getMixesIsLoading = (state) => state.mixes.isLoading
const getMixesIsSaving = (state) => state.mixes.isSaving
const getMixesError = (state) => state.mixes.error

const getMixes = Getter(
  getMixesRecords,
  getMetas,
  getChannels,
  getClips,
  (mixes, metas, channels, clips) => {
    return mapValues(mixes, (flatMix, mixId) => {
      if (!channels[flatMix.channelId]) {
        return flatMix
      } else {
        const nestedMix = nestMix({ ...flatMix, channels, clips })
        return {
          ...nestedMix,
          meta: metas[nestedMix.id],
          primaryTracks: getPrimaryTracks(nestedMix, metas)
        }
      }
    })
  }
)

const getMixList = Getter(
  getMixes,
  (mixes) => values(mixes)
)

const getMixListProps = Struct({
  mixes: getMixes,
  mixList: getMixList,
  isLoading: getMixesIsLoading,
  isSaving: getMixesIsSaving,
  error: getMixesError
})

const getMixProps = Struct({
  mixes: getMixes,
  isLoading: getMixesIsLoading,
  isSaving: getMixesIsSaving,
  error: getMixesError
})

module.exports = {
  getMixListProps,
  getMixProps
}
