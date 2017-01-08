const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { mapValues, values, omitBy, isNil } = require('lodash')

const { getMetas } = require('../metas/getters')

const getSamplesRecords = (state) => state.samples.records
const getSamplesIsLoading = (state) => state.samples.isLoading
const getSamplesIsCreating = (state) => state.samples.isCreating
const getSamplesIsAnalyzing = (state) => state.samples.isAnalyzing
const getSamplesError = (state) => state.samples.error

const getSamples = Getter(
  getSamplesRecords,
  getMetas,
  (samples, metas) => omitBy(mapValues(samples, (sample, sampleId) => ({
    ...sample,
    meta: metas[sampleId] || {}
  })), isNil)
)

const getSampleList = Getter(
  getSamples,
  (samples) => values(samples)
)

const getSampleListProps = Struct({
  samples: getSamples,
  sampleList: getSampleList,
  isLoading: getSamplesIsLoading,
  isCreating: getSamplesIsCreating,
  isAnalyzing: getSamplesIsAnalyzing,
  error: getSamplesError
})

const getSampleProps = Struct({
  samples: getSamples,
  isLoading: getSamplesIsLoading,
  isCreating: getSamplesIsCreating,
  isAnalyzing: getSamplesIsAnalyzing,
  error: getSamplesError
})

module.exports = {
  getSampleListProps,
  getSampleProps
}
