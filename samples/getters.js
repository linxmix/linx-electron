const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { values } = require('lodash')

const getMixes = (state) => state.mixes.records
const getMixesIsLoading = (state) => state.mixes.isLoading

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
