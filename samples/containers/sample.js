const React = require('react')
const { connect } = require('react-redux')
const { keys } = require('lodash')

const { getSampleProps } = require('../getters')
const { loadSample } = require('../actions')
const Waveform = require('../../lib/react-waveform')

class SampleContainer extends React.Component {
  render () {
    const { sample, isLoading, error } = this.props
    const { isAnalyzing } = sample
    console.log('sample', sample)

    return <div>
      <header>
        {isLoading && <div>'loading sample…'</div>}
        {isAnalyzing && <div>'analyzing sample…'</div>}
        <div>{error || 'no errors'}</div>
      </header>
      <section>
        {keys(sample.meta).map(key => {
          return <div key={key}>{key}: {sample.meta[key]}</div>
        })}
        { sample.audioBuffer && <Waveform audioBuffer={sample.audioBuffer} /> }
      </section>
    </div>
  }

  componentDidMount () {
    const { loadSample, sample } = this.props

    if (sample && !sample.audioBuffer) {
      loadSample({ id: sample.id })
    }
  }
}

module.exports = connect(
  (state, ownProps) => {
    const props = getSampleProps(state)
    const currentSampleId = ownProps.params.sampleId
    return { ...props, sample: props.samples[currentSampleId] }
  },
  { loadSample }
)(SampleContainer)
