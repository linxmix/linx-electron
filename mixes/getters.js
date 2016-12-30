const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { mapValues, values } = require('lodash')

const { getChannels } = require('../channels/getters')
const { getClips } = require('../clips/getters')
const nestMix = require('./helpers/nest')

const getMixesRecords = (state) => state.mixes.records
const getMixesIsLoading = (state) => state.mixes.isLoading
const getMixesIsSaving = (state) => state.mixes.isSaving
const getMixesError = (state) => state.mixes.error

const getMixes = Getter(
  getMixesRecords,
  getChannels,
  getClips,
  (mixes, channels, clips) => {
    return mapValues(mixes, (mix, mixId) => {
      return (mix.channelId && channels[mix.channelId])
        ? nestMix({ ...mix, channels, clips })
        : mix
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
