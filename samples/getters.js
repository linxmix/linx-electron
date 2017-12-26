const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { filter, mapValues, values, includes } = require('lodash')

const { getMetas } = require('../metas/getters')

const getSamplesRecords = (state) => state.samples.records
const getSampleListIsLoading = (state) => state.samples.isLoadingList
const getSamplesCreating = (state) => state.samples.creating
const getSamplesAnalyzing = (state) => state.samples.analyzing
const getSamplesLoading = (state) => state.samples.loading
const getSamplesError = (state) => state.samples.error

const getSamples = Getter(
  getSamplesRecords,
  getMetas,
  getSamplesAnalyzing,
  getSamplesLoading,
  (samples, metas, analyzing, loading) => mapValues(samples, (sample, sampleId) => ({
    ...sample,
    meta: metas[sampleId] || {},
    isAnalyzing: includes(analyzing, sampleId),
    isLoading: includes(loading, sampleId)
  }))
)

const getReverbSamples = Getter(
  getSamples,
  samples => filter(samples, 'isReverbSample')
)

const getSampleList = Getter(
  getSamples,
  (samples) => values(samples)
)

const getSampleListProps = Struct({
  samples: getSamples,
  sampleList: getSampleList,
  isLoadingList: getSampleListIsLoading,
  creatingSamples: getSamplesCreating,
  error: getSamplesError
})

const getSampleProps = Struct({
  samples: getSamples,
  error: getSamplesError
})

module.exports = {
  getSamples,
  getReverbSamples,
  getSampleListProps,
  getSampleProps,
  getSamplesError
}
