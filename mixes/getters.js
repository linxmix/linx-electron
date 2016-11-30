const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { mapValues, values } = require('lodash')

const { getChannels } = require('../channels/getters')
const nestMix = require('./helpers/nest')

const getMixesRecords = (state) => state.mixes.records
const getMixesIsLoading = (state) => state.mixes.isLoading

const getMixes = Getter(
  getMixesRecords,
  getChannels,
  (mixes, channels) => {
    return mapValues(mixes, (mix, mixId) => {
      return (mix.channelId && channels[mix.channelId])
        ? nestMix({ ...mix, channels })
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
  isLoading: getMixesIsLoading
})

const getMixProps = Struct({
  mixes: getMixes,
  isLoading: getMixesIsLoading
})

module.exports = {
  getMixListProps,
  getMixProps
}
