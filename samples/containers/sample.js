const React = require('react')
const { connect } = require('react-redux')

const { getSampleProps } = require('../getters')
const { loadSample } = require('../actions')
const Waveform = require('../../lib/react-waveform')

class SampleContainer extends React.Component {
  render () {
    const { sample, isLoading } = this.props
    console.log('sample', sample)

    return <div>
      <header>
        sample is {isLoading ? 'loading' : 'here'}
      </header>
      <section>
        {sample.id}
        { sample.audioBuffer && <Waveform audioBuffer={sample.audioBuffer} /> }
      </section>
    </div>
  }

  componentDidMount () {
    const { loadSample, sample } = this.props
    loadSample({ id: sample.id })
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
