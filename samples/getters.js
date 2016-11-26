const { createSelector: Getter, createStructuredSelector: Struct } = require('reselect')
const { values } = require('lodash')

const getSamples = (state) => state.samples.records
const getSamplesIsLoading = (state) => state.samples.isLoading

const getSampleList = Getter(
  getSamples,
  (samples) => { console.log('samples', samples, values(samples)); return values(samples) }
)

const getSampleListProps = Struct({
  samples: getSamples,
  sampleList: getSampleList,
  isLoading: getSamplesIsLoading
})

const getSampleProps = Struct({
  samples: getSamples,
  isLoading: getSamplesIsLoading
})

module.exports = {
  getSampleListProps,
  getSampleProps
}
