const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { values } = require('lodash')

const getSamples = (state) => state.samples.records
const getSamplesIsLoading = (state) => state.samples.isLoading
const getSamplesIsCreating = (state) => state.samples.isCreating
const getSamplesError = (state) => state.samples.error

const getSampleList = Getter(
  getSamples,

  // TODO: load and connect metas, too. display list of titles, not IDs
  (samples) => values(samples)
)

const getSampleListProps = Struct({
  samples: getSamples,
  sampleList: getSampleList,
  isLoading: getSamplesIsLoading,
  isCreating: getSamplesIsCreating,
  error: getSamplesError
})

const getSampleProps = Struct({
  samples: getSamples,
  isLoading: getSamplesIsLoading,
  isCreating: getSamplesIsCreating,
  error: getSamplesError
})

module.exports = {
  getSampleListProps,
  getSampleProps
}
