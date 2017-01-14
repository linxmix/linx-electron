const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { mapValues, values, includes } = require('lodash')

const { getMetas } = require('../metas/getters')

const getSamplesRecords = (state) => state.samples.records
const getSamplesIsLoading = (state) => state.samples.isLoading
const getSamplesCreating = (state) => state.samples.creating
const getSamplesError = (state) => state.samples.error
const getSamplesAnalyzing = (state) => state.samples.analyzing

const getSamples = Getter(
  getSamplesRecords,
  getMetas,
  getSamplesAnalyzing,
  (samples, metas, analyzing) => mapValues(samples, (sample, sampleId) => ({
    ...sample,
    meta: metas[sampleId] || {},
    isAnalyzing: includes(analyzing, sampleId)
  }))
)

const getSampleList = Getter(
  getSamples,
  (samples) => values(samples)
)

const getSampleListProps = Struct({
  samples: getSamples,
  sampleList: getSampleList,
  isLoading: getSamplesIsLoading,
  creatingSamples: getSamplesCreating,
  error: getSamplesError
})

const getSampleProps = Struct({
  samples: getSamples,
  isLoading: getSamplesIsLoading,
  error: getSamplesError
})

module.exports = {
  getSampleListProps,
  getSampleProps
}
